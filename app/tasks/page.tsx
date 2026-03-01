import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, areas, projects, sprints } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { TasksClient } from './tasks-client'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allTasks, allAreas, allProjects, allSprints] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)).orderBy(desc(tasks.createdAt)),
    db.select().from(areas).where(eq(areas.workspaceId, workspaceId)),
    db.select().from(projects).where(eq(projects.workspaceId, workspaceId)),
    db.select().from(sprints).where(eq(sprints.workspaceId, workspaceId)),
  ])

  return (
    <TasksClient
      initialTasks={allTasks}
      workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'}
      areas={allAreas}
      projects={allProjects}
      sprints={allSprints}
    />
  )
}
