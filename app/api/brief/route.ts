import { NextRequest, NextResponse } from 'next/server'
import { getSession, getSessionData } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import { apiHandler } from '@/lib/api-handler'
import { logActivity } from '@/lib/activity'

const sql = neon(process.env.DATABASE_URL!)

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT id, content, generated_at, workspace_id, generated_by
    FROM briefs
    ORDER BY generated_at DESC
    LIMIT 1
  `
  if (rows.length === 0) return NextResponse.json({ brief: null })
  return NextResponse.json({ brief: rows[0] })
})

const postSchema = z.object({
  content: z.string().min(1),
  workspace_id: z.string().optional(),
  generated_by: z.string().optional(),
})

export const POST = apiHandler(async (req: NextRequest) => {
  const sessionData = await getSessionData()
  if (!sessionData) return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  if (sessionData.role === 'guest') {
    return NextResponse.json({ error: 'Forbidden: guests cannot post briefs', code: 'forbidden' }, { status: 403 })
  }

  const parsed = postSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format(), code: 'validation_error' }, { status: 400 })
  }
  const { content, workspace_id } = parsed.data

  // Provenance: explicit body value wins, then the harness header identity
  // (bearer-authed agents), then the legacy default.
  const generatedBy = parsed.data.generated_by ?? sessionData.harnessName ?? 'charlie'

  const rows = await sql`
    INSERT INTO briefs (content, workspace_id, generated_by)
    VALUES (${content}, ${workspace_id ?? null}, ${generatedBy})
    RETURNING id, content, generated_at, workspace_id, generated_by
  `

  await logActivity({
    workspaceId: workspace_id ?? 'personal',
    actor: generatedBy,
    action: 'brief_published',
    entityType: 'brief',
    entityId: rows[0].id as string,
    entityTitle: `Brief ${new Date().toISOString().slice(0, 10)}`,
    description: `${generatedBy} published a brief`,
    actorType: sessionData.harnessName ? 'agent' : 'human',
    actorId: sessionData.userId,
    actorName: generatedBy,
    eventFamily: 'comms',
    eventType: 'brief_published',
    sourceSystem: sessionData.harnessName ? 'api' : 'dashboard',
    workflowRunId: sessionData.harnessSessionId,
    apiModel: sessionData.harnessModel,
    status: 'success',
  })

  return NextResponse.json({ brief: rows[0] }, { status: 201 })
})
