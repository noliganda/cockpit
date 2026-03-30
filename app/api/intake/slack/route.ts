import { NextRequest, NextResponse } from 'next/server'
import { processIntake } from '@/lib/intake-pipeline'
import {
  verifySlackSignature,
  normalizeSlackEvent,
  normalizeSlackSlashCommand,
  normalizeSlackDirect,
  type SlackEventPayload,
  type SlackSlashCommandPayload,
  type SlackDirectPayload,
} from '@/lib/slack-intake'
import {
  buildConfirmationText,
  postToResponseUrl,
  postToChannel,
  postErrorToResponseUrl,
} from '@/lib/slack-confirm'
import { inferThreadParent } from '@/lib/slack-thread-inference'
import { classifyIntake } from '@/lib/intake'
import type { IntakePayload } from '@/types'

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? ''

/**
 * Run thread inference on a normalized IntakePayload.
 * Pre-classifies to determine object type, then checks thread context.
 */
async function enrichWithThreadInference(payload: IntakePayload): Promise<IntakePayload> {
  const classification = classifyIntake(payload)
  const { payload: enriched, inference } = await inferThreadParent(payload, classification.objectType)
  if (inference.attempted) {
    console.log(`[slack-thread-inference] ${inference.reason}`)
  }
  return enriched
}

/**
 * POST /api/intake/slack
 *
 * Accepts three payload shapes:
 * 1. Slack Events API (type: "event_callback" or "url_verification")
 * 2. Slack slash commands (has "command" field)
 * 3. Direct structured payloads (has "text" field, no "type"/"command")
 *
 * Thread replies automatically infer parent task from the root message.
 * After successful intake, sends confirmation back to Slack.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // ── Slack signature verification ──────────────────────────────────────
    if (SLACK_SIGNING_SECRET) {
      const timestamp = request.headers.get('x-slack-request-timestamp') ?? ''
      const signature = request.headers.get('x-slack-signature') ?? ''

      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
        return NextResponse.json({ error: 'Request too old' }, { status: 403 })
      }

      const valid = await verifySlackSignature(SLACK_SIGNING_SECRET, timestamp, rawBody, signature)
      if (!valid) {
        return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 403 })
      }
    }

    const body = JSON.parse(rawBody) as Record<string, unknown>

    // ── Handle Slack URL verification challenge ──────────────────────────
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge })
    }

    // ── Detect payload type and normalize ────────────────────────────────
    type PayloadMode = 'event' | 'slash_command' | 'direct'
    let intakePayload: IntakePayload | null = null
    let mode: PayloadMode
    let responseUrl: string | undefined
    let confirmChannelId: string | undefined
    let confirmThreadTs: string | undefined

    if (body.type === 'event_callback') {
      mode = 'event'
      const eventPayload = body as unknown as SlackEventPayload
      intakePayload = normalizeSlackEvent(eventPayload)
      if (!intakePayload) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'No actionable text in event' })
      }
      confirmChannelId = eventPayload.event?.channel
      confirmThreadTs = eventPayload.event?.ts

    } else if (typeof body.command === 'string') {
      mode = 'slash_command'
      const cmdPayload = body as unknown as SlackSlashCommandPayload
      intakePayload = normalizeSlackSlashCommand(cmdPayload)
      responseUrl = cmdPayload.response_url

    } else if (typeof body.text === 'string') {
      mode = 'direct'
      const directPayload = body as unknown as SlackDirectPayload
      intakePayload = normalizeSlackDirect(directPayload)
      confirmChannelId = directPayload.channelId
      confirmThreadTs = directPayload.threadTs

    } else {
      return NextResponse.json({
        error: 'Unrecognized payload shape. Expected Slack event, slash command, or direct payload with text field.',
      }, { status: 400 })
    }

    // ── Thread inference: enrich with parent from Slack thread ───────────
    intakePayload = await enrichWithThreadInference(intakePayload)

    // ── For slash commands: return immediate acknowledgment ──────────────
    if (mode === 'slash_command' && responseUrl) {
      const url = responseUrl
      const finalPayload = intakePayload
      void (async () => {
        try {
          const result = await processIntake(finalPayload, {
            actorType: (finalPayload.actorType ?? 'human') as 'human' | 'agent' | 'system',
            actorId: finalPayload.actorId ?? 'slack',
            actorName: finalPayload.actorName ?? 'Slack',
          })
          await postToResponseUrl(url, result)
        } catch (err) {
          console.error('[POST /api/intake/slack] async slash command processing error:', err)
          await postErrorToResponseUrl(url, 'Failed to process intake request')
        }
      })()

      return new NextResponse(null, { status: 200 })
    }

    // ── For events + direct: process synchronously, confirm async ────────
    const result = await processIntake(intakePayload, {
      actorType: (intakePayload.actorType ?? 'system') as 'human' | 'agent' | 'system',
      actorId: intakePayload.actorId ?? 'slack',
      actorName: intakePayload.actorName ?? 'Slack',
    })

    if (confirmChannelId) {
      void postToChannel(confirmChannelId, result, confirmThreadTs)
    }

    if (mode === 'event') {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({
      ...result,
      slackConfirmation: buildConfirmationText(result),
    }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/intake/slack]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
