import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { areas, projects, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AreasClient } from './areas-client'

export default async function AreasPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allAreas, allProjects, allTasks] = await Promise.all([
    db.select().from(areas).where(eq(areas.workspaceId, workspaceId)),
    db.select().from(projects).where(eq(projects.workspaceId, workspaceId)),
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
  ])

  return (
    <AreasClient
      key={workspaceId}
      initialAreas={allAreas}
      allProjects={allProjects}
      allTasks={allTasks}
      workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'}
    />
  )
}
