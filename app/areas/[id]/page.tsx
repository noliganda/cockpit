import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { areas, projects, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AreaDetailClient } from './area-detail-client'

export default async function AreaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [area] = await db.select().from(areas).where(eq(areas.id, id)).limit(1)
  if (!area) notFound()

  const [areaProjects, areaTasks] = await Promise.all([
    db.select().from(projects).where(eq(projects.areaId, id)),
    db.select().from(tasks).where(eq(tasks.areaId, id)),
  ])

  return (
    <AreaDetailClient
      area={area as import('@/types').Area}
      projects={areaProjects as import('@/types').Project[]}
      tasks={areaTasks as import('@/types').Task[]}
      workspaceId={workspaceId}
    />
  )
}
