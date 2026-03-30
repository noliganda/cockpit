import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, areas, projects } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { KanbanClient } from './kanban-client'

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allTasks, allAreas, allProjects] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.workspaceId, workspaceId), isNull(tasks.parentTaskId))),
    db.select().from(areas).where(eq(areas.workspaceId, workspaceId)),
    db.select().from(projects).where(eq(projects.workspaceId, workspaceId)),
  ])

  return (
    <KanbanClient
      initialTasks={allTasks}
      workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'}
      areas={allAreas}
      projects={allProjects}
    />
  )
}
