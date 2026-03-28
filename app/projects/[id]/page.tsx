import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, tasks, notes, areas, milestones, bookmarks, projectContacts, contacts, userBases } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { ProjectDetailClient } from './project-detail-client'
import type { Project, Task, Note, Area, Milestone, Bookmark, ProjectContact, Contact, UserBase } from '@/types'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) notFound()

  const [projectTasks, projectNotes, projectMilestones, projectBookmarks, projectContactRows, workspaceContactRows, projectBasesRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, id)),
    db.select().from(notes).where(eq(notes.projectId, id)),
    db.select().from(milestones).where(eq(milestones.projectId, id)).orderBy(asc(milestones.date)),
    db.select().from(bookmarks).where(eq(bookmarks.projectId, id)),
    db.select({
      id: projectContacts.id,
      projectId: projectContacts.projectId,
      contactId: projectContacts.contactId,
      role: projectContacts.role,
      createdAt: projectContacts.createdAt,
      contact: contacts,
    }).from(projectContacts)
      .innerJoin(contacts, eq(projectContacts.contactId, contacts.id))
      .where(eq(projectContacts.projectId, id)),
    db.select().from(contacts).where(eq(contacts.workspaceId, project.workspaceId)),
    db.select().from(userBases).where(eq(userBases.projectId, id)),
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
      initialMilestones={projectMilestones as Milestone[]}
      initialBookmarks={projectBookmarks as Bookmark[]}
      initialProjectContacts={projectContactRows as ProjectContact[]}
      workspaceContacts={workspaceContactRows as Contact[]}
      projectBases={projectBasesRows as UserBase[]}
    />
  )
}
