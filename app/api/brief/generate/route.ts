import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { neon } from '@neondatabase/serverless'
import OpenAI from 'openai'

const sql = neon(process.env.DATABASE_URL!)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workspaceId } = await req.json().catch(() => ({}))

  // Fetch live data context
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in3Days = new Date(today)
  in3Days.setDate(today.getDate() + 3)
  const in3DaysStr = in3Days.toISOString().split('T')[0]

  const [taskRows, projectRows, calendarRows] = await Promise.all([
    sql`SELECT title, status, due_date, urgent, important, priority, workspace_id
        FROM tasks
        WHERE status NOT IN ('Done','Cancelled','Delivered','Won','Completed','Paid')
        ORDER BY due_date ASC NULLS LAST
        LIMIT 40`,
    sql`SELECT name, status, end_date, workspace_id, starred
        FROM projects
        WHERE status NOT IN ('Completed','Archived','Won')
        ORDER BY starred DESC, end_date ASC NULLS LAST
        LIMIT 20`,
    sql`SELECT title, start_time, end_time, workspace_id
        FROM calendar_events
        WHERE date(start_time) = ${todayStr}
        ORDER BY start_time ASC
        LIMIT 10`.catch(() => []),
  ])

  // Build context
  const overdueTasks = taskRows.filter((t: Record<string, unknown>) => t.due_date && (t.due_date as string) < todayStr)
  const urgentTasks = taskRows.filter((t: Record<string, unknown>) => t.urgent || t.important)
  const dueSoonTasks = taskRows.filter((t: Record<string, unknown>) => t.due_date && (t.due_date as string) >= todayStr && (t.due_date as string) <= in3DaysStr)

  const wsLabel = (id: string | null) => {
    if (id === 'bf') return 'Byron Film'
    if (id === 'korus') return 'KORUS'
    if (id === 'personal') return 'Personal'
    return id ?? 'Unknown'
  }

  const contextLines = [
    `Date: ${today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
    `OPEN TASKS: ${taskRows.length} total`,
    overdueTasks.length > 0
      ? `OVERDUE (${overdueTasks.length}): ${overdueTasks.slice(0, 5).map((t: Record<string, unknown>) => `"${t.title}" [${wsLabel(t.workspace_id as string | null)}]`).join(', ')}`
      : 'No overdue tasks',
    urgentTasks.length > 0
      ? `URGENT/IMPORTANT (${urgentTasks.length}): ${urgentTasks.slice(0, 5).map((t: Record<string, unknown>) => `"${t.title}" [${wsLabel(t.workspace_id as string | null)}]`).join(', ')}`
      : '',
    dueSoonTasks.length > 0
      ? `DUE IN 3 DAYS (${dueSoonTasks.length}): ${dueSoonTasks.slice(0, 5).map((t: Record<string, unknown>) => `"${t.title}" due ${t.due_date} [${wsLabel(t.workspace_id as string | null)}]`).join(', ')}`
      : '',
    '',
    `ACTIVE PROJECTS (${projectRows.filter((p: Record<string, unknown>) => !DONE_STATUSES.includes(p.status as string)).length}): ${projectRows.slice(0, 6).map((p: Record<string, unknown>) => `"${p.name}" [${wsLabel(p.workspace_id as string | null)}]${p.end_date ? ` due ${p.end_date}` : ''}`).join(', ')}`,
    '',
    calendarRows.length > 0
      ? `TODAY'S CALENDAR: ${calendarRows.map((e: Record<string, unknown>) => {
          const start = e.start_time ? new Date(e.start_time as string).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''
          return `${start} ${e.title}`
        }).join(', ')}`
      : 'No calendar events today (calendar may not be synced)',
  ].filter(Boolean).join('\n')

  const systemPrompt = `You are Charlie, an AI operations assistant for Olivier Marcolin (Oli), a multi-business operator running Byron Film (video production) and KORUS Group (commercial fit-out). You write a concise daily brief in his voice — direct, warm, no fluff.

Write a morning brief that is:
- 5-8 lines maximum
- Plain prose (no headers, minimal bullet points — only if genuinely needed)
- Prioritised: mention the most important things first
- Honest: if something needs attention, say so clearly
- Conversational: write like a smart colleague, not a status report bot
- In markdown (bold for emphasis only where it really matters)

Start with the most pressing thing — not a generic "good morning". End with something positive or motivating if the day looks manageable.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is today's data snapshot:\n\n${contextLines}\n\nWrite the brief.` },
    ],
    max_tokens: 400,
    temperature: 0.7,
  })

  const content = completion.choices[0]?.message?.content ?? 'No brief generated.'

  // Save to DB
  const rows = await sql`
    INSERT INTO briefs (content, workspace_id, generated_by)
    VALUES (${content}, ${workspaceId ?? null}, 'openai')
    RETURNING id, content, generated_at, workspace_id, generated_by
  `

  return NextResponse.json({ brief: rows[0] })
}
