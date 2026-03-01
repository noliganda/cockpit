'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { type Area, type Project, type Task } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  'Planning': 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]',
  'Active': 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  'On Hold': 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]',
  'Completed': 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]',
  'Archived': 'text-[#4B5563] bg-[rgba(75,85,99,0.12)]',
}

const TASK_STATUS_ORDER = ['In Progress', 'To Do', 'Backlog', 'Needs Review', 'Done', 'Cancelled']

type Tab = 'overview' | 'projects' | 'tasks'

interface AreaDetailClientProps {
  area: Area
  projects: Project[]
  tasks: Task[]
  workspaceId: string
}

export function AreaDetailClient({ area, projects, tasks, workspaceId }: AreaDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const spheres = area.spheresOfResponsibility ?? []
  const activeTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Cancelled')
  const activeProjects = projects.filter(p => p.status !== 'Archived')
  const archivedProjects = projects.filter(p => p.status === 'Archived')

  // Group tasks by status
  const tasksByStatus: Record<string, Task[]> = {}
  for (const status of TASK_STATUS_ORDER) {
    const group = tasks.filter(t => t.status === status)
    if (group.length > 0) tasksByStatus[status] = group
  }
  // Any tasks with statuses not in our order list
  for (const task of tasks) {
    if (!TASK_STATUS_ORDER.includes(task.status)) {
      if (!tasksByStatus[task.status]) tasksByStatus[task.status] = []
      tasksByStatus[task.status].push(task)
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: `Projects (${projects.length})` },
    { id: 'tasks', label: `Tasks (${tasks.length})` },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href={`/areas?workspace=${workspaceId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Areas
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          {area.icon && <span className="text-3xl">{area.icon}</span>}
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{area.name}</h1>
          {area.context && (
            <span className={cn(
              'text-xs px-2 py-1 rounded font-medium',
              area.context === 'Internal'
                ? 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]'
                : 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]'
            )}>
              {area.context}
            </span>
          )}
          {area.status === 'archived' && (
            <span className="text-xs px-2 py-1 rounded bg-[rgba(107,114,128,0.12)] text-[#6B7280]">Archived</span>
          )}
        </div>
        {area.description && (
          <p className="text-sm text-[#A0A0A0] max-w-2xl">{area.description}</p>
        )}
        {/* Spheres of responsibility pills */}
        {spheres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {spheres.map(sphere => (
              <span key={sphere} className="text-xs px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                {sphere}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[rgba(255,255,255,0.06)] pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-[#F5F5F5] border-[#F5F5F5]'
                : 'text-[#6B7280] border-transparent hover:text-[#A0A0A0]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Projects', value: projects.length },
              { label: 'Total Tasks', value: tasks.length },
              { label: 'Active Tasks', value: activeTasks.length },
            ].map(stat => (
              <div key={stat.label} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-[#F5F5F5] font-mono">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Description card */}
          {area.description && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-[#A0A0A0] leading-relaxed">{area.description}</p>
            </div>
          )}

          {/* Context + spheres card */}
          {(area.context || spheres.length > 0) && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Context & Responsibilities</h3>
              {area.context && (
                <div className="mb-3">
                  <p className="text-xs text-[#6B7280] mb-1">Context</p>
                  <span className={cn(
                    'text-sm px-2.5 py-1 rounded font-medium',
                    area.context === 'Internal'
                      ? 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]'
                      : 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]'
                  )}>
                    {area.context}
                  </span>
                </div>
              )}
              {spheres.length > 0 && (
                <div>
                  <p className="text-xs text-[#6B7280] mb-2">Spheres of Responsibility</p>
                  <div className="flex flex-wrap gap-1.5">
                    {spheres.map(sphere => (
                      <span key={sphere} className="text-xs px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                        {sphere}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {/* Active projects */}
          {activeProjects.length > 0 && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Active ({activeProjects.length})</h3>
              <div className="space-y-2">
                {activeProjects.map(project => {
                  const projectTaskCount = tasks.filter(t => t.projectId === project.id).length
                  const statusClass = STATUS_COLORS[project.status ?? ''] ?? 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]'
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?workspace=${workspaceId}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.02)] transition-all"
                    >
                      <span className="text-sm text-[#F5F5F5] flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-[#6B7280] shrink-0">{projectTaskCount} tasks</span>
                      {project.status && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', statusClass)}>
                          {project.status}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Archived projects */}
          {archivedProjects.length > 0 && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] opacity-60">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Archived ({archivedProjects.length})</h3>
              <div className="space-y-2">
                {archivedProjects.map(project => {
                  const projectTaskCount = tasks.filter(t => t.projectId === project.id).length
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?workspace=${workspaceId}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-all"
                    >
                      <span className="text-sm text-[#A0A0A0] flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-[#6B7280] shrink-0">{projectTaskCount} tasks</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', STATUS_COLORS['Archived'])}>
                        Archived
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {projects.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm text-[#4B5563]">No projects in this area yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {Object.keys(tasksByStatus).length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#4B5563]">No tasks in this area yet.</p>
            </div>
          ) : (
            Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <div key={status} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs text-[#6B7280] uppercase tracking-wide">{status}</h3>
                  <span className="text-xs text-[#4B5563]">({statusTasks.length})</span>
                </div>
                <div className="space-y-1.5">
                  {statusTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-[6px] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.06)] transition-all">
                      <span className="text-sm text-[#F5F5F5] flex-1 truncate">{task.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.urgent && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.12)] text-[#EF4444]">Urgent</span>
                        )}
                        {task.important && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.12)] text-[#F59E0B]">Important</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-[#6B7280]">
                            {new Date(task.dueDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
