import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { commItems, activityLog } from '@/lib/db/schema'
import { and, desc, eq, gte, lt, or } from 'drizzle-orm'
import { z } from 'zod'
import { apiHandler } from '@/lib/api-handler'
import { getSession, getSessionData } from '@/lib/auth'
import { getWorkspaceIds } from '@/lib/workspaces'
import { logActivity } from '@/lib/activity'

const SOURCES = ['email', 'whatsapp', 'slack', 'manual'] as const
const CLASSIFICATIONS = ['needs-reply', 'invoice', 'newsletter', 'notification', 'fyi', 'spam', 'unknown'] as const
const ACTIONS = ['drafted', 'archived', 'surfaced', 'left', 'queued-task', 'none'] as const
const DRAFT_STATUSES = ['awaiting-review', 'sent', 'dismissed'] as const
const URGENCIES = ['interrupt', 'digest', 'low'] as const

const itemSchema = z.object({
  source: z.enum(SOURCES),
  workspaceId: z.string().min(1),
  externalId: z.string().min(1),
  sender: z.string().min(1),
  subject: z.string().min(1),
  preview: z.string().min(1),
  classification: z.enum(CLASSIFICATIONS),
  actionTaken: z.enum(ACTIONS).default('none'),
  draftId: z.string().nullish(),
  draftStatus: z.enum(DRAFT_STATUSES).nullish(),
  urgency: z.enum(URGENCIES).default('digest'),
  messageTs: z.string().datetime({ offset: true }),
  runId: z.string().min(1),
  linkedTaskId: z.string().uuid().nullish(),
})

const postSchema = z.object({ items: z.array(itemSchema).min(1).max(100) })

/**
 * Bulk upsert of digest items published by the Email PA (and other producers).
 * (source, externalId) is the idempotency anchor: re-posting a run's payload
 * updates rows in place and creates no duplicates. One digest_published
 * activity event per NEW runId — never one per email, never twice per run.
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const sessionData = await getSessionData()
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  if (sessionData.role === 'guest') {
    return NextResponse.json({ error: 'Forbidden: guests cannot publish messages', code: 'forbidden' }, { status: 403 })
  }

  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format(), code: 'validation_error' }, { status: 400 })
  }
  const items = parsed.data.items

  const validWorkspaceIds = await getWorkspaceIds()
  const badWorkspaces = [...new Set(items.map((i) => i.workspaceId).filter((w) => !validWorkspaceIds.includes(w)))]
  if (validWorkspaceIds.length > 0 && badWorkspaces.length > 0) {
    return NextResponse.json({
      error: `Unknown workspaceId(s): ${badWorkspaces.join(', ')}. Use GET /api/workspaces to list valid IDs.`,
      code: 'invalid_workspace',
      validWorkspaceIds,
    }, { status: 422 })
  }

  let upserted = 0
  for (const item of items) {
    await db
      .insert(commItems)
      .values({
        ...item,
        draftId: item.draftId ?? null,
        draftStatus: item.draftStatus ?? null,
        linkedTaskId: item.linkedTaskId ?? null,
        messageTs: new Date(item.messageTs),
      })
      .onConflictDoUpdate({
        target: [commItems.source, commItems.externalId],
        set: {
          workspaceId: item.workspaceId,
          sender: item.sender,
          subject: item.subject,
          preview: item.preview,
          classification: item.classification,
          actionTaken: item.actionTaken,
          draftId: item.draftId ?? null,
          draftStatus: item.draftStatus ?? null,
          urgency: item.urgency,
          messageTs: new Date(item.messageTs),
          runId: item.runId,
          linkedTaskId: item.linkedTaskId ?? null,
          updatedAt: new Date(),
        },
      })
    upserted++
  }

  // One activity event per run (spec §8.7): log only runIds this call
  // introduced — a re-post of an already-published run stays silent.
  const runIds = [...new Set(items.map((i) => i.runId))]
  const producer = sessionData.harnessName ?? sessionData.email
  const loggedRuns: string[] = []
  for (const runId of runIds) {
    const [already] = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(and(eq(activityLog.eventType, 'digest_published'), eq(activityLog.workflowRunId, runId)))
      .limit(1)
    if (already) continue
    const runItems = items.filter((i) => i.runId === runId)
    await logActivity({
      workspaceId: runItems[0].workspaceId,
      actor: producer,
      action: 'digest_published',
      entityType: 'comm_run',
      entityId: runId,
      entityTitle: `Digest run ${runId}`,
      description: `${producer} published ${runItems.length} digest item${runItems.length === 1 ? '' : 's'}`,
      metadata: {
        runId,
        itemCount: runItems.length,
        sources: [...new Set(runItems.map((i) => i.source))],
        drafts: runItems.filter((i) => i.draftStatus === 'awaiting-review').length,
        interrupts: runItems.filter((i) => i.urgency === 'interrupt').length,
      },
      actorType: sessionData.harnessName ? 'agent' : 'human',
      actorId: sessionData.userId,
      actorName: producer,
      eventFamily: 'comms',
      eventType: 'digest_published',
      sourceSystem: 'hermes',
      workflowRunId: runId,
      apiModel: sessionData.harnessModel,
      status: 'success',
    })
    loggedRuns.push(runId)
  }

  return NextResponse.json({ upserted, runIds, loggedRuns }, { status: 201 })
})

/** Feed: newest first, keyset-paginated on (messageTs, id). */
export const GET = apiHandler(async (req: NextRequest) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const filters = []
  const workspace = sp.get('workspace') ?? sp.get('workspaceId')
  if (workspace) filters.push(eq(commItems.workspaceId, workspace))
  const source = sp.get('source')
  if (source) filters.push(eq(commItems.source, source))
  const classification = sp.get('classification')
  if (classification) filters.push(eq(commItems.classification, classification))
  const draftStatus = sp.get('draftStatus')
  if (draftStatus) filters.push(eq(commItems.draftStatus, draftStatus))
  const since = sp.get('since')
  if (since) {
    const sinceDate = new Date(since)
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid since timestamp', code: 'validation_error' }, { status: 400 })
    }
    filters.push(gte(commItems.messageTs, sinceDate))
  }

  const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '50', 10) || 50, 1), 100)

  const cursor = sp.get('cursor')
  if (cursor) {
    try {
      const [ts, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
      const cursorDate = new Date(ts)
      if (isNaN(cursorDate.getTime()) || !id) throw new Error('bad cursor')
      filters.push(or(
        lt(commItems.messageTs, cursorDate),
        and(eq(commItems.messageTs, cursorDate), lt(commItems.id, id)),
      )!)
    } catch {
      return NextResponse.json({ error: 'Invalid cursor', code: 'validation_error' }, { status: 400 })
    }
  }

  const rows = await db
    .select()
    .from(commItems)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(commItems.messageTs), desc(commItems.id))
    .limit(limit + 1)

  const page = rows.slice(0, limit)
  const nextCursor = rows.length > limit && page.length > 0
    ? Buffer.from(`${page[page.length - 1].messageTs.toISOString()}|${page[page.length - 1].id}`).toString('base64url')
    : null

  return NextResponse.json({ items: page, nextCursor })
})
