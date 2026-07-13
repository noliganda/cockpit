import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { upsertContactFromTwentyPerson, detachDeletedPerson } from '@/lib/crm/twenty-sync'
import type { TwentyPerson } from '@/lib/crm/twenty-mapping'

/**
 * Twenty CRM webhook receiver (task c68df6e1).
 *
 * Twenty (tailnet-only on the Mini) pushes person.* events OUT to this public
 * Vercel endpoint — the reverse of the Mini worker's outbound/poll passes, chosen
 * so Twenty never has to be exposed. Each POST carries exactly one event.
 *
 * Signature (verified against Twenty v2.20.0 source, call-webhook.job.js):
 *   HMAC-SHA256(secret, `${timestampHeader}:${rawBody}`)  — hex
 * where rawBody is the exact bytes Twenty serialized (its payload minus `secret`),
 * so we MUST hash the untouched request text, never a re-encoded object.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface TwentyWebhookBody {
  eventName?: string
  objectMetadata?: { nameSingular?: string } | null
  workspaceId?: string
  webhookId?: string
  record?: TwentyPerson
  updatedFields?: string[]
}

const MAX_SKEW_MS = 10 * 60 * 1000 // reject stale/replayed deliveries

function verify(rawBody: string, timestamp: string | null, signature: string | null, secret: string): boolean {
  if (!timestamp || !signature) return false
  const skew = Math.abs(Date.now() - Number(timestamp))
  if (!Number.isFinite(skew) || skew > MAX_SKEW_MS) return false
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}:${rawBody}`).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(signature, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const secret = process.env.TWENTY_WEBHOOK_SECRET
  if (!secret) {
    console.error('[crm/webhooks/twenty] TWENTY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  const rawBody = await req.text()
  const ok = verify(
    rawBody,
    req.headers.get('x-twenty-webhook-timestamp'),
    req.headers.get('x-twenty-webhook-signature'),
    secret,
  )
  if (!ok) return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })

  let body: TwentyWebhookBody
  try {
    body = JSON.parse(rawBody) as TwentyWebhookBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const [nameSingular, action] = (body.eventName ?? '').split('.')
  if (nameSingular !== 'person') {
    // We only sync people for now — ack so Twenty marks it delivered.
    return NextResponse.json({ ok: true, ignored: body.eventName ?? null })
  }

  const record = body.record
  if (!record?.id) return NextResponse.json({ error: 'missing_record' }, { status: 400 })

  try {
    if (action === 'deleted') {
      const result = await detachDeletedPerson(record.id, { via: 'webhook' })
      return NextResponse.json({ ok: true, ...result })
    }
    // created | updated (and any future upsert-shaped action)
    const result = await upsertContactFromTwentyPerson(record, {
      twentyWorkspaceId: body.workspaceId,
      via: 'webhook',
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[crm/webhooks/twenty] sync failed', err)
    // 500 → Twenty logs a failed delivery; the Mini reconcile poll is the backstop.
    return NextResponse.json({ error: 'sync_failed' }, { status: 500 })
  }
}
