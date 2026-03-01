import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { aiMetrics } from '@/lib/db/schema'
import { desc, gte, lte, and } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const createSchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly']),
  periodStart: z.string(),
  periodEnd: z.string(),
  tasksCompleted: z.number().int().optional(),
  tasksTotal: z.number().int().optional(),
  avgTaskDurationMins: z.number().optional(),
  automationRate: z.number().optional(),
  apiCostUsd: z.number().optional(),
  costPerTask: z.number().optional(),
  emailsSent: z.number().int().optional(),
  emailsReceived: z.number().int().optional(),
  avgResponseTimeMins: z.number().optional(),
  humanInterventionRate: z.number().optional(),
  clientSatisfaction: z.enum(['positive', 'neutral', 'negative']).optional(),
  securityIncidents: z.number().int().optional(),
  notes: z.string().optional(),
  reportingPhase: z.enum(['daily', 'weekly', 'copil']).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const conditions = []
  if (from) conditions.push(gte(aiMetrics.periodStart, from))
  if (to) conditions.push(lte(aiMetrics.periodEnd, to))

  const rows = await db
    .select()
    .from(aiMetrics)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(aiMetrics.periodStart))
    .limit(200)

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { avgTaskDurationMins, automationRate, apiCostUsd, costPerTask, avgResponseTimeMins, humanInterventionRate, ...rest } = parsed.data

  const [row] = await db
    .insert(aiMetrics)
    .values({
      ...rest,
      avgTaskDurationMins: avgTaskDurationMins !== undefined ? String(avgTaskDurationMins) : undefined,
      automationRate: automationRate !== undefined ? String(automationRate) : undefined,
      apiCostUsd: apiCostUsd !== undefined ? String(apiCostUsd) : undefined,
      costPerTask: costPerTask !== undefined ? String(costPerTask) : undefined,
      avgResponseTimeMins: avgResponseTimeMins !== undefined ? String(avgResponseTimeMins) : undefined,
      humanInterventionRate: humanInterventionRate !== undefined ? String(humanInterventionRate) : undefined,
    })
    .returning()

  return NextResponse.json(row, { status: 201 })
}
