import { NextRequest, NextResponse } from 'next/server'
import { processIntake } from '@/lib/intake-pipeline'
import { z } from 'zod'
import { getSessionData } from '@/lib/auth'

// ── Intake payload schema ────────────────────────────────────────────────────

const intakeSchema = z.object({
  sourceType: z.enum(['slack', 'manual', 'email', 'form', 'api', 'imported']),
  rawText: z.string().min(1, 'rawText is required'),
  workspaceId: z.string().optional(),
  objectTypeHint: z.enum(['task', 'project', 'event', 'document_request', 'communication_action', 'research_request']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  sourceChannel: z.string().optional(),
  sourceMessageId: z.string().optional(),
  sourceUrl: z.string().optional(),
  sourceCreatedAt: z.string().optional(),
  parentTaskId: z.string().uuid().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
  actorType: z.enum(['human', 'agent', 'system']).optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const sessionData = await getSessionData()
    if (!sessionData) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (sessionData.role === 'guest') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as unknown
    const parsed = intakeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const payload = parsed.data

    const result = await processIntake(payload, {
      actorType: (payload.actorType ?? 'human') as 'human' | 'agent' | 'system',
      actorId: payload.actorId ?? sessionData.userId,
      actorName: payload.actorName ?? sessionData.email,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[POST /api/intake]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
