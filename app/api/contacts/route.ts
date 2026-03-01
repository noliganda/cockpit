import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { logActivity } from '@/lib/activity'
import { z } from 'zod'
import { getSession } from '@/lib/auth'

const createSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  company: z.string().optional(),
  organisationId: z.string().uuid().optional(),
  role: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  linkedinUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  notes: z.string().optional(),
  pipelineStage: z.string().optional(),
  nextReachDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace')

  const rows = await db
    .select()
    .from(contacts)
    .where(workspaceId ? eq(contacts.workspaceId, workspaceId) : undefined)
    .orderBy(desc(contacts.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const [contact] = await db.insert(contacts).values(parsed.data).returning()

  await logActivity({
    workspaceId: contact.workspaceId,
    action: 'created',
    entityType: 'contact',
    entityId: contact.id,
    entityTitle: contact.name,
  })

  return NextResponse.json(contact, { status: 201 })
}
