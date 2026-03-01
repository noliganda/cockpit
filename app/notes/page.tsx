import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { notes } from '@/lib/db/schema'
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

  const allNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.workspaceId, workspaceId))
    .orderBy(desc(notes.updatedAt))

  return <NotesClient key={workspaceId} initialNotes={allNotes} workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'} />
}
