import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, activityLog, projects, contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { WORKSPACES } from '@/types'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage({
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

  const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']

  const wsFilter = workspaceId
  const [allTasks, allProjects, allContacts, recentActivity] = await Promise.all([
    wsFilter
      ? db.select().from(tasks).where(eq(tasks.workspaceId, wsFilter))
      : db.select().from(tasks),
    wsFilter
      ? db.select().from(projects).where(eq(projects.workspaceId, wsFilter))
      : db.select().from(projects),
    wsFilter
      ? db.select({ id: contacts.id }).from(contacts).where(eq(contacts.workspaceId, wsFilter))
      : db.select({ id: contacts.id }).from(contacts),
    db.select({
        id: activityLog.id,
        workspaceId: activityLog.workspaceId,
        actor: activityLog.actor,
        action: activityLog.action,
        entityType: activityLog.entityType,
        entityTitle: activityLog.entityTitle,
        description: activityLog.description,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(20),
  ])

  const openTasks = allTasks.filter(t => !DONE_STATUSES.includes(t.status)).length
  const activeProjects = allProjects.filter(p => p.status === 'Active').length
  const overdueItems = allTasks.filter(t =>
    t.dueDate && t.dueDate < todayStr && !DONE_STATUSES.includes(t.status)
  ).length
  const contactCount = allContacts.length

  const upcomingTasks = allTasks
    .filter(t => t.dueDate && t.dueDate >= todayStr && t.dueDate <= in7DaysStr && !DONE_STATUSES.includes(t.status))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 8)

  const workspaceBreakdown = WORKSPACES.map(ws => ({
    ...ws,
    total: allTasks.filter(t => t.workspaceId === ws.id).length,
    completed: allTasks.filter(t => t.workspaceId === ws.id && DONE_STATUSES.includes(t.status)).length,
  }))

  // Featured projects: starred first, then Active, max 5
  const featuredProjects = [
    ...allProjects.filter(p => p.starred && !DONE_STATUSES.includes(p.status ?? '')),
    ...allProjects.filter(p => !p.starred && p.status === 'Active'),
  ].slice(0, 5)

  return (
    <DashboardClient
      key={workspaceId ?? 'all'}
      stats={{ openTasks, activeProjects, overdueItems, contactCount }}
      upcomingTasks={upcomingTasks}
      recentActivity={recentActivity}
      workspaceBreakdown={workspaceBreakdown}
      featuredProjects={featuredProjects}
      workspaceId={workspaceId}
    />
  )
}
