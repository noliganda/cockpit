import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, tasks, notes, areas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ProjectDetailClient } from './project-detail-client'
import type { Project, Task, Note, Area } from '@/types'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) notFound()

  const [projectTasks, projectNotes] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, id)),
    db.select().from(notes).where(eq(notes.projectId, id)),
  ])

  let area: Area | null = null
  if (project.areaId) {
    const [areaRow] = await db.select().from(areas).where(eq(areas.id, project.areaId)).limit(1)
    if (areaRow) area = areaRow as Area
  }

  const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']
  const completed = projectTasks.filter(t => DONE_STATUSES.includes(t.status)).length
  const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0

  return (
    <ProjectDetailClient
      project={project as Project}
      projectTasks={projectTasks as Task[]}
      projectNotes={projectNotes as Note[]}
      area={area}
      progress={progress}
    />
  )
}
