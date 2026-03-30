/**
 * Slack Confirmation — OPS v5
 *
 * Builds confirmation messages from intake results and posts them back to Slack.
 * Non-blocking: confirmation failures are logged but never break intake.
 */

import type { IntakeResult } from '@/types'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? ''
const COCKPIT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? ''

// ── Message builder ──────────────────────────────────────────────────────────

function objectLabel(result: IntakeResult): string {
  switch (result.objectType) {
    case 'task': return result.parentTaskId ? 'Subtask' : 'Task'
    case 'project': return 'Project'
    case 'event': return 'Event'
    case 'document_request': return 'Document request'
    case 'communication_action': return 'Communication action'
    case 'research_request': return 'Research request'
    default: return 'Item'
  }
}

function confidenceBadge(result: IntakeResult): string {
  if (result.isDraft) return ' (draft — needs review)'
  if (result.confidence === 'low') return ' (low confidence)'
  return ''
}

function cockpitLink(result: IntakeResult): string {
  if (!COCKPIT_BASE_URL) return ''
  const base = COCKPIT_BASE_URL.startsWith('http') ? COCKPIT_BASE_URL : `https://${COCKPIT_BASE_URL}`
  if (result.objectType === 'project') {
    return `${base}/projects/${result.objectId}`
  }
  return `${base}/tasks?workspace=${result.workspaceId}`
}

/**
 * Build a plain-text Slack confirmation message from an intake result.
 */
export function buildConfirmationText(result: IntakeResult): string {
  const label = objectLabel(result)
  const badge = confidenceBadge(result)
  const link = cockpitLink(result)

  let msg = `${label} created${badge}: *${result.title}*`

  if (result.parentTaskId) {
    msg += `\n_Created as subtask_`
  }

  if (link) {
    msg += `\n<${link}|View in Cockpit>`
  }

  return msg
}

/**
 * Build a Slack Block Kit message for richer formatting.
 */
export function buildConfirmationBlocks(result: IntakeResult): Record<string, unknown>[] {
  const label = objectLabel(result)
  const badge = confidenceBadge(result)
  const link = cockpitLink(result)

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${label} created${badge}*\n${result.title}`,
      },
    },
  ]

  const contextElements: Record<string, unknown>[] = [
    { type: 'mrkdwn', text: `Workspace: \`${result.workspaceId}\`` },
    { type: 'mrkdwn', text: `Type: \`${result.objectType}\`` },
  ]

  if (result.parentTaskId) {
    contextElements.push({ type: 'mrkdwn', text: 'Subtask' })
  }
  if (result.isDraft) {
    contextElements.push({ type: 'mrkdwn', text: 'Needs review' })
  }

  blocks.push({
    type: 'context',
    elements: contextElements,
  })

  if (link) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in Cockpit' },
          url: link,
          action_id: 'view_in_cockpit',
        },
      ],
    })
  }

  return blocks
}

/**
 * Build a failure/error message.
 */
export function buildErrorText(error: string): string {
  return `Intake could not be processed: ${error}`
}

// ── Posting ──────────────────────────────────────────────────────────────────

/**
 * Post confirmation to a Slack response_url (slash commands, interactive messages).
 * Fire-and-forget — errors are logged, never thrown.
 */
export async function postToResponseUrl(
  responseUrl: string,
  result: IntakeResult,
): Promise<void> {
  try {
    const res = await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'in_channel',
        text: buildConfirmationText(result),
        blocks: buildConfirmationBlocks(result),
      }),
    })
    if (!res.ok) {
      console.error('[slack-confirm] response_url post failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (err) {
    console.error('[slack-confirm] response_url post error:', err)
  }
}

/**
 * Post confirmation to a Slack channel via Slack API (chat.postMessage).
 * Requires SLACK_BOT_TOKEN to be set.
 * Fire-and-forget — errors are logged, never thrown.
 */
export async function postToChannel(
  channelId: string,
  result: IntakeResult,
  threadTs?: string,
): Promise<void> {
  if (!SLACK_BOT_TOKEN) {
    console.warn('[slack-confirm] SLACK_BOT_TOKEN not set, skipping channel post')
    return
  }

  try {
    const body: Record<string, unknown> = {
      channel: channelId,
      text: buildConfirmationText(result),
      blocks: buildConfirmationBlocks(result),
    }
    // Reply in thread if we have a thread_ts
    if (threadTs) {
      body.thread_ts = threadTs
    }

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error('[slack-confirm] chat.postMessage failed:', res.status)
    } else {
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) {
        console.error('[slack-confirm] chat.postMessage API error:', data.error)
      }
    }
  } catch (err) {
    console.error('[slack-confirm] chat.postMessage error:', err)
  }
}

/**
 * Post an error confirmation to a Slack response_url.
 */
export async function postErrorToResponseUrl(
  responseUrl: string,
  error: string,
): Promise<void> {
  try {
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: buildErrorText(error),
      }),
    })
  } catch (err) {
    console.error('[slack-confirm] error response_url post failed:', err)
  }
}
