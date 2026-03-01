import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { MatrixClient } from './matrix-client'

export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))

  return <MatrixClient initialTasks={allTasks} workspaceId={workspaceId as 'byron-film' | 'korus' | 'personal'} />
}
