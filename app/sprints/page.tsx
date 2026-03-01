import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { sprints, tasks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { SprintsClient } from './sprints-client'
import type { Sprint, Task } from '@/types'

export default async function SprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allSprints, allTasks] = await Promise.all([
    db.select().from(sprints).where(eq(sprints.workspaceId, workspaceId)).orderBy(desc(sprints.createdAt)),
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
  ])

  return (
    <SprintsClient
      key={workspaceId}
      initialSprints={allSprints as Sprint[]}
      workspaceId={workspaceId}
      allTasks={allTasks as Task[]}
    />
  )
}
