import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { notes, projects, areas, sprints } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { NotesClient } from './notes-client'

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allNotes, allProjects, allAreas, allSprints] = await Promise.all([
    db.select().from(notes).where(eq(notes.workspaceId, workspaceId)).orderBy(desc(notes.updatedAt)),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.workspaceId, workspaceId)),
    db.select({ id: areas.id, name: areas.name }).from(areas).where(eq(areas.workspaceId, workspaceId)),
    db.select({ id: sprints.id, name: sprints.name }).from(sprints).where(eq(sprints.workspaceId, workspaceId)),
  ])

  return (
    <NotesClient
      key={workspaceId}
      initialNotes={allNotes}
      workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'}
      projects={allProjects}
      areas={allAreas}
      sprints={allSprints}
    />
  )
}
