import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { calculatePriorities, type ProjectData, type TaskData } from '@/lib/priority-engine'
import { PriorityClient } from './priority-client'

export default async function PriorityPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace: wsParam } = await searchParams
  const workspaceId = wsParam ?? 'byron-film'

  try {
    // Fetch all projects and tasks for this workspace
    const [allProjects, allTasks] = await Promise.all([
      db.select().from(projects).where(eq(projects.workspaceId, workspaceId)),
      db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
    ])

    // Map database schema to priority engine types
    const projectsData: ProjectData[] = allProjects
      .filter(p => p.status !== 'complete')
      .map(p => ({
        id: p.id,
        name: p.title,
        business: (p.workspace?.includes('korus') ? 'Korus' : p.workspace?.includes('oliver') ? 'OM' : 'BF') as 'OM' | 'BF' | 'Korus',
        projectType: (p.metadata?.projectType ?? 'income') as 'income' | 'family' | 'hybrid',
        profitabilityEstimate: p.metadata?.profitabilityEstimate ?? null,
        deadline: p.metadata?.deadline ? new Date(p.metadata.deadline) : null,
        percentComplete: 0, // TODO: Calculate from task completions
        status: p.status as 'active' | 'paused' | 'complete',
      }))

    const tasksData: TaskData[] = allTasks
      .filter(t => t.status !== 'complete')
      .map(t => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        status: t.status as 'pending' | 'in_progress' | 'complete' | 'blocked',
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        estimateHours: t.estimateHours ?? 4,
        isBlocking: t.metadata?.isBlocking ?? false,
        isCriticalPath: t.metadata?.isCriticalPath ?? false,
        description: t.description ?? undefined,
      }))

    // Calculate priorities
    const results = calculatePriorities(projectsData, tasksData)

    return (
      <PriorityClient
        key={workspaceId}
        projects={results.projects}
        tasks={results.tasks}
        stats={results.stats}
        workspaceId={workspaceId}
      />
    )
  } catch (error) {
    console.error('Failed to calculate priorities:', error)
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-[#6B7280]">Failed to load task prioritization data</p>
      </div>
    )
  }
}
