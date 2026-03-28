import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { calculatePriorities, type ProjectData, type TaskData } from '@/lib/priority-engine'
import { PriorityClient } from './priority-client'

function mapWorkspaceToBusiness(workspaceId: string): 'OM' | 'BF' | 'Korus' {
  if (workspaceId.includes('korus')) return 'Korus'
  if (workspaceId.includes('oliver') || workspaceId.includes('personal')) return 'OM'
  return 'BF' // default: Byron Film
}

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
      .filter(p => p.status !== 'complete' && p.status !== 'Complete')
      .map(p => ({
        id: p.id,
        name: p.name,
        business: mapWorkspaceToBusiness(workspaceId),
        projectType: 'income' as const, // default; could be extended later
        profitabilityEstimate: p.budget ? parseFloat(String(p.budget)) : null,
        deadline: p.endDate ? new Date(p.endDate) : null,
        percentComplete: 0, // calculated from task counts if needed
        status: (p.status?.toLowerCase() === 'active' ? 'active' : p.status?.toLowerCase() === 'paused' ? 'paused' : 'active') as 'active' | 'paused' | 'complete',
      }))

    const tasksData: TaskData[] = allTasks
      .filter(t => t.status !== 'Done' && t.status !== 'Complete')
      .map(t => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId ?? '',
        status: (t.status === 'In Progress' ? 'in_progress' : t.status === 'Blocked' ? 'blocked' : 'pending') as 'pending' | 'in_progress' | 'complete' | 'blocked',
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        estimateHours: 4, // no estimate field in schema — use default
        isBlocking: false, // no isBlocking field — use urgent as proxy
        isCriticalPath: t.urgent === true && t.important === true, // both urgent+important = critical path
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
