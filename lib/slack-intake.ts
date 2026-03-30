/**
 * Slack → IntakePayload Normalizer — OPS v5
 *
 * Transforms Slack webhook payloads into the canonical IntakePayload shape.
 * Deterministic, no AI, inspectable.
 *
 * Supports:
 * - Slack Events API (message events)
 * - Slack slash command payloads
 * - Direct structured payloads (from bots/automations)
 */

import type { IntakePayload } from '@/types'

// ── Slack workspace → Cockpit workspace mapping ─────────────────────────────

const CHANNEL_WORKSPACE_MAP: Record<string, string> = {
  // Map known Slack channel prefixes/names to Cockpit workspaces
  'om-': 'personal',
  'bf-': 'byron-film',
  'byron': 'byron-film',
  'korus': 'korus',
}

function resolveWorkspaceFromChannel(channelName?: string): string | undefined {
  if (!channelName) return undefined
  const lower = channelName.toLowerCase()
  for (const [prefix, workspace] of Object.entries(CHANNEL_WORKSPACE_MAP)) {
    if (lower.startsWith(prefix) || lower.includes(prefix)) return workspace
  }
  return undefined
}

// ── Slack message URL builder ────────────────────────────────────────────────

function buildSlackMessageUrl(teamId?: string, channelId?: string, messageTs?: string): string | undefined {
  if (!channelId || !messageTs) return undefined
  // Slack deep link format: https://app.slack.com/client/{team}/{channel}/p{ts_without_dot}
  const tsNoDot = messageTs.replace('.', '')
  if (teamId) {
    return `https://app.slack.com/client/${teamId}/${channelId}/p${tsNoDot}`
  }
  return undefined
}

// ── Slack Events API payload shape ───────────────────────────────────────────

export interface SlackEventPayload {
  type: 'event_callback' | 'url_verification'
  challenge?: string // url_verification
  token?: string
  team_id?: string
  event?: {
    type: string // 'message', 'app_mention', etc.
    text?: string
    user?: string
    channel?: string
    channel_type?: string
    ts?: string
    thread_ts?: string
  }
}

// ── Slack slash command payload shape ─────────────────────────────────────────

export interface SlackSlashCommandPayload {
  command: string
  text: string
  user_id: string
  user_name: string
  channel_id: string
  channel_name: string
  team_id: string
  response_url: string
  trigger_id: string
}

// ── Direct structured payload (from bot/automation) ──────────────────────────

export interface SlackDirectPayload {
  text: string
  channelId?: string
  channelName?: string
  userId?: string
  userName?: string
  teamId?: string
  messageTs?: string
  threadTs?: string
  workspaceHint?: string
  parentTaskId?: string
}

// ── Normalizers ──────────────────────────────────────────────────────────────

/**
 * Normalize a Slack Events API message event into IntakePayload.
 */
export function normalizeSlackEvent(payload: SlackEventPayload): IntakePayload | null {
  const event = payload.event
  if (!event || !event.text) return null

  const channelId = event.channel
  const workspaceHint = resolveWorkspaceFromChannel(channelId)

  return {
    sourceType: 'slack',
    rawText: event.text,
    workspaceId: workspaceHint,
    sourceChannel: channelId,
    sourceMessageId: event.ts,
    sourceUrl: buildSlackMessageUrl(payload.team_id, channelId, event.ts),
    sourceCreatedAt: event.ts ? new Date(parseFloat(event.ts) * 1000).toISOString() : undefined,
    actorType: 'human',
    actorId: event.user,
    actorName: event.user, // Will be resolved to display name if available
    metadata: {
      slackTeamId: payload.team_id,
      slackChannelType: event.channel_type,
      slackThreadTs: event.thread_ts,
    },
  }
}

/**
 * Normalize a Slack slash command into IntakePayload.
 */
export function normalizeSlackSlashCommand(payload: SlackSlashCommandPayload): IntakePayload {
  const workspaceHint = resolveWorkspaceFromChannel(payload.channel_name)

  return {
    sourceType: 'slack',
    rawText: payload.text,
    workspaceId: workspaceHint,
    sourceChannel: payload.channel_id,
    sourceUrl: undefined, // slash commands don't have a message URL
    actorType: 'human',
    actorId: payload.user_id,
    actorName: payload.user_name,
    metadata: {
      slackCommand: payload.command,
      slackTeamId: payload.team_id,
      slackChannelName: payload.channel_name,
      slackTriggerId: payload.trigger_id,
    },
  }
}

/**
 * Normalize a direct structured payload (from bot/automation) into IntakePayload.
 * This is the simplest and most common path for agent-driven Slack intake.
 */
export function normalizeSlackDirect(payload: SlackDirectPayload): IntakePayload {
  const workspaceHint = payload.workspaceHint ?? resolveWorkspaceFromChannel(payload.channelName)

  return {
    sourceType: 'slack',
    rawText: payload.text,
    workspaceId: workspaceHint,
    sourceChannel: payload.channelId ?? payload.channelName,
    sourceMessageId: payload.messageTs,
    sourceUrl: buildSlackMessageUrl(payload.teamId, payload.channelId, payload.messageTs),
    sourceCreatedAt: payload.messageTs ? new Date(parseFloat(payload.messageTs) * 1000).toISOString() : undefined,
    parentTaskId: payload.parentTaskId,
    actorType: 'human',
    actorId: payload.userId,
    actorName: payload.userName,
    metadata: {
      slackTeamId: payload.teamId,
      slackChannelName: payload.channelName,
      slackThreadTs: payload.threadTs,
    },
  }
}

// ── Slack signature verification ─────────────────────────────────────────────

/**
 * Verify Slack request signature using HMAC-SHA256.
 * Returns true if the signature is valid.
 */
export async function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string,
): Promise<boolean> {
  const baseString = `v0:${timestamp}:${body}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(baseString))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  const computed = `v0=${hex}`

  // Timing-safe comparison
  if (computed.length !== signature.length) return false
  let mismatch = 0
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return mismatch === 0
}
