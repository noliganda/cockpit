import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { sprints, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SprintDetailClient } from './sprint-detail-client'
import type { Sprint, Task } from '@/types'

export default async function SprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1)
  if (!sprint) notFound()

  const allWorkspaceTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, sprint.workspaceId))

  const sprintTasks = allWorkspaceTasks.filter(t => t.sprintId === id)
  const backlogTasks = allWorkspaceTasks.filter(t => !t.sprintId || t.sprintId !== id)

  return (
    <SprintDetailClient
      sprint={sprint as Sprint}
      sprintTasks={sprintTasks as Task[]}
      backlogTasks={backlogTasks as Task[]}
      workspaceId={sprint.workspaceId}
    />
  )
}
