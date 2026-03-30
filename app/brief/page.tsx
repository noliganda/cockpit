import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, projects } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { BriefClient } from './brief-client'

const sql = neon(process.env.DATABASE_URL!)
const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace: wsParam } = await searchParams
  const workspaceId = wsParam ?? null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)
  const in7DaysStr = in7Days.toISOString().split('T')[0]

  const [allTasks, allProjects, calendarRows, briefRows] = await Promise.all([
    workspaceId
      ? db.select().from(tasks).where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.parentTaskId)))
      : db.select().from(tasks).where(isNull(tasks.parentTaskId)),
    workspaceId
      ? db.select().from(projects).where(eq(projects.workspaceId, workspaceId))
      : db.select().from(projects),
    sql`SELECT title, start_time, end_time, workspace_id
        FROM calendar_events
        WHERE date(start_time) = ${todayStr}
        ORDER BY start_time ASC
        LIMIT 8`.catch(() => []),
    sql`SELECT id, content, generated_at, generated_by
        FROM briefs
        ORDER BY generated_at DESC
        LIMIT 1`.catch(() => []),
  ])

  const openTasks = allTasks.filter(t => !DONE_STATUSES.includes(t.status))
  const criticalTasks = openTasks
    .filter(t => t.urgent || t.important || (t.dueDate && t.dueDate <= todayStr))
    .sort((a, b) => {
      const aOverdue = a.dueDate && a.dueDate < todayStr ? -1 : 0
      const bOverdue = b.dueDate && b.dueDate < todayStr ? -1 : 0
      return aOverdue - bOverdue || (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    })
    .slice(0, 8)

  const overdueCount = openTasks.filter(t => t.dueDate && t.dueDate < todayStr).length
  const dueTodayCount = openTasks.filter(t => t.dueDate === todayStr).length
  const dueThisWeek = openTasks.filter(t => t.dueDate && t.dueDate > todayStr && t.dueDate <= in7DaysStr).length

  const activeProjects = allProjects
    .filter(p => !DONE_STATUSES.includes(p.status ?? ''))
    .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
    .slice(0, 6)

  type BriefRow = { id: string; content: string; generated_at: string; generated_by: string }

  return (
    <BriefClient
      workspaceId={workspaceId}
      latestBrief={(briefRows[0] as BriefRow) ?? null}
      criticalTasks={criticalTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueDate: t.dueDate ?? null,
        urgent: t.urgent ?? false,
        important: t.important ?? false,
        workspaceId: t.workspaceId ?? null,
      }))}
      activeProjects={activeProjects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status ?? null,
        endDate: p.endDate ?? null,
        starred: p.starred ?? false,
        workspaceId: p.workspaceId ?? null,
      }))}
      calendarEvents={(calendarRows as Array<Record<string, unknown>>).map(e => ({
        title: e.title as string,
        startTime: e.start_time as string,
        endTime: e.end_time as string | null,
        workspaceId: e.workspace_id as string | null,
      }))}
      stats={{
        openTasks: openTasks.length,
        overdueCount,
        dueTodayCount,
        dueThisWeek,
        activeProjectCount: activeProjects.length,
      }}
    />
  )
}
