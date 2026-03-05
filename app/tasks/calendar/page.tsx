import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, milestones, sprints, projects } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { CalendarClient } from '@/app/calendar/calendar-client'

export default async function TasksCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace: wsParam } = await searchParams
  const workspaceId = wsParam ?? 'byron-film'

  const [allTasks, allSprints, workspaceProjects] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    db.select().from(sprints).where(eq(sprints.workspaceId, workspaceId)),
    db.select({ id: projects.id }).from(projects).where(eq(projects.workspaceId, workspaceId)),
  ])

  const projectIds = workspaceProjects.map(p => p.id)
  const allMilestones = projectIds.length > 0
    ? await db.select().from(milestones).where(inArray(milestones.projectId, projectIds))
    : []

  return (
    <CalendarClient
      key={workspaceId}
      initialTasks={allTasks}
      initialMilestones={allMilestones}
      initialSprints={allSprints}
      workspaceId={workspaceId}
    />
  )
}
