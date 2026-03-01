import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, tasks, areas, contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ProjectsClient } from './projects-client'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allProjects, allTasks, allAreas, allContacts] = await Promise.all([
    db.select().from(projects).where(eq(projects.workspaceId, workspaceId)),
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    db.select().from(areas).where(eq(areas.workspaceId, workspaceId)),
    db.select().from(contacts).where(eq(contacts.workspaceId, workspaceId)),
  ])

  return (
    <ProjectsClient
      initialProjects={allProjects}
      allTasks={allTasks}
      allAreas={allAreas}
      allContacts={allContacts}
      workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'}
    />
  )
}
