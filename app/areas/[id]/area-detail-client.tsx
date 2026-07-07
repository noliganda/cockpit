'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Table2 } from 'lucide-react'
import { type Area, type Project, type Task, type Note, type UserBase } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  'Planning': 'text-[#5F7A72] bg-[rgba(95,122,114,0.12)]',
  'Active': 'text-[#7D9B5E] bg-[rgba(125,155,94,0.12)]',
  'On Hold': 'text-[#C9962E] bg-[rgba(201,150,46,0.12)]',
  'Completed': 'text-[#7A6F55] bg-[rgba(122,111,85,0.12)]',
  'Archived': 'text-[#5C5340] bg-[rgba(92,83,64,0.12)]',
}

const TASK_STATUS_ORDER = ['In Progress', 'To Do', 'Backlog', 'Needs Review', 'Done', 'Cancelled']

type Tab = 'overview' | 'projects' | 'tasks' | 'notes' | 'bases'

interface AreaDetailClientProps {
  area: Area
  projects: Project[]
  tasks: Task[]
  notes: Note[]
  bases: UserBase[]
  workspaceId: string
}

export function AreaDetailClient({ area, projects, tasks, notes, bases, workspaceId }: AreaDetailClientProps) {
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
    { id: 'notes', label: `Notes (${notes.length})` },
    { id: 'bases', label: `Bases (${bases.length})` },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href={`/areas?workspace=${workspaceId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[#7A6F55] hover:text-[#E8DFCE] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Areas
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          {area.icon && <span className="text-3xl">{area.icon}</span>}
          <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">{area.name}</h1>
          {area.context && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-none font-medium',
              area.context === 'Internal'
                ? 'text-[#5F7A72] bg-[rgba(95,122,114,0.12)]'
                : 'text-[#7D9B5E] bg-[rgba(125,155,94,0.12)]'
            )}>
              {area.context}
            </span>
          )}
          {area.status === 'archived' && (
            <span className="text-xs px-2 py-1 rounded-none bg-[rgba(122,111,85,0.12)] text-[#7A6F55]">Archived</span>
          )}
        </div>
        {area.description && (
          <p className="text-sm text-[#A79B78] max-w-2xl">{area.description}</p>
        )}
        {/* Spheres of responsibility pills */}
        {spheres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {spheres.map(sphere => (
              <span key={sphere} className="text-xs px-2 py-1 rounded-none bg-[rgba(167,155,120,0.13)] border border-[rgba(167,155,120,0.18)] text-[#A79B78]">
                {sphere}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[rgba(167,155,120,0.13)] pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-[#E8DFCE] border-[#E8DFCE]'
                : 'text-[#7A6F55] border-transparent hover:text-[#A79B78]'
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
              <div key={stat.label} className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
                <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-[#E8DFCE] font-mono">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Description card */}
          {area.description && (
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <h3 className="text-xs text-[#7A6F55] uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-[#A79B78] leading-relaxed">{area.description}</p>
            </div>
          )}

          {/* Context + spheres card */}
          {(area.context || spheres.length > 0) && (
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <h3 className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Context & Responsibilities</h3>
              {area.context && (
                <div className="mb-3">
                  <p className="text-xs text-[#7A6F55] mb-1">Context</p>
                  <span className={cn(
                    'text-sm px-2.5 py-1 rounded-none font-medium',
                    area.context === 'Internal'
                      ? 'text-[#5F7A72] bg-[rgba(95,122,114,0.12)]'
                      : 'text-[#7D9B5E] bg-[rgba(125,155,94,0.12)]'
                  )}>
                    {area.context}
                  </span>
                </div>
              )}
              {spheres.length > 0 && (
                <div>
                  <p className="text-xs text-[#7A6F55] mb-2">Spheres of Responsibility</p>
                  <div className="flex flex-wrap gap-1.5">
                    {spheres.map(sphere => (
                      <span key={sphere} className="text-xs px-2 py-1 rounded-none bg-[rgba(167,155,120,0.13)] border border-[rgba(167,155,120,0.18)] text-[#A79B78]">
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
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <h3 className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Active ({activeProjects.length})</h3>
              <div className="space-y-2">
                {activeProjects.map(project => {
                  const projectTaskCount = tasks.filter(t => t.projectId === project.id).length
                  const statusClass = STATUS_COLORS[project.status ?? ''] ?? 'text-[#7A6F55] bg-[rgba(122,111,85,0.12)]'
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?workspace=${workspaceId}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-none border border-[rgba(167,155,120,0.09)] hover:border-[rgba(167,155,120,0.18)] hover:bg-[rgba(167,155,120,0.04)] transition-all"
                    >
                      <span className="text-sm text-[#E8DFCE] flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-[#7A6F55] shrink-0">{projectTaskCount} tasks</span>
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
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] opacity-60">
              <h3 className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Archived ({archivedProjects.length})</h3>
              <div className="space-y-2">
                {archivedProjects.map(project => {
                  const projectTaskCount = tasks.filter(t => t.projectId === project.id).length
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}?workspace=${workspaceId}`}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-none border border-[rgba(167,155,120,0.09)] hover:border-[rgba(167,155,120,0.18)] transition-all"
                    >
                      <span className="text-sm text-[#A79B78] flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-[#7A6F55] shrink-0">{projectTaskCount} tasks</span>
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
              <p className="text-sm text-[#5C5340]">No projects in this area yet.</p>
            </div>
          )}
        </div>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {notes.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#5C5340]">No notes in this area yet.</p>
              <Link href={`/notes?workspace=${workspaceId}`}
                className="mt-2 inline-block text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors">
                Create a note and assign it to this area →
              </Link>
            </div>
          ) : (
            notes.map(note => {
              // Extract plaintext preview from BlockNote JSON or plain string
              let preview = ''
              try {
                const blocks = typeof note.content === 'string'
                  ? JSON.parse(note.content) as Array<{ content?: Array<{ text?: string }> }>
                  : note.content as Array<{ content?: Array<{ text?: string }> }>
                if (Array.isArray(blocks)) {
                  preview = blocks
                    .map(b => Array.isArray(b.content) ? b.content.map(i => i.text ?? '').join('') : '')
                    .filter(Boolean).join(' ')
                }
              } catch { preview = '' }

              return (
                <Link key={note.id} href={`/notes?workspace=${workspaceId}&note=${note.id}`}
                  className="flex items-start gap-3 p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] hover:border-[rgba(167,155,120,0.22)] hover:bg-[#201A14] transition-all group">
                  <FileText className="w-4 h-4 text-[#5C5340] shrink-0 mt-0.5 group-hover:text-[#7A6F55] transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#E8DFCE] truncate mb-0.5">{note.title || 'Untitled'}</p>
                    {preview && (
                      <p className="text-xs text-[#7A6F55] line-clamp-2">{preview}</p>
                    )}
                  </div>
                  <span className="text-xs text-[#5C5340] shrink-0 mt-0.5">
                    {note.updatedAt
                      ? new Date(note.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                </Link>
              )
            })
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {Object.keys(tasksByStatus).length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#5C5340]">No tasks in this area yet.</p>
            </div>
          ) : (
            Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <div key={status} className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs text-[#7A6F55] uppercase tracking-wide">{status}</h3>
                  <span className="text-xs text-[#5C5340]">({statusTasks.length})</span>
                </div>
                <div className="space-y-1.5">
                  {statusTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-none border border-[rgba(167,155,120,0.09)] hover:border-[rgba(167,155,120,0.13)] transition-all">
                      <span className="text-sm text-[#E8DFCE] flex-1 truncate">{task.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.urgent && (
                          <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(192,69,46,0.12)] text-[#C0452E]">Urgent</span>
                        )}
                        {task.important && (
                          <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(201,150,46,0.12)] text-[#C9962E]">Important</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-[#7A6F55]">
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

      {/* Bases Tab */}
      {activeTab === 'bases' && (
        <div className="space-y-3">
          {bases.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#5C5340]">No bases in this area yet.</p>
              <Link href={`/bases?workspace=${workspaceId}`}
                className="mt-2 inline-block text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors">
                Go to Bases to create one and link it to this area →
              </Link>
            </div>
          ) : (
            bases.map(base => (
              <Link key={base.id} href={`/bases/${base.id}`}
                className="flex items-start gap-3 p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] hover:border-[rgba(167,155,120,0.22)] hover:bg-[#201A14] transition-all group">
                <Table2 className="w-4 h-4 text-[#5C5340] shrink-0 mt-0.5 group-hover:text-[#7A6F55] transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#E8DFCE] truncate mb-0.5">{base.name}</p>
                  {base.description && (
                    <p className="text-xs text-[#7A6F55] line-clamp-1">{base.description}</p>
                  )}
                </div>
                {base.isPublic && (
                  <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(125,155,94,0.12)] text-[#7D9B5E] shrink-0">Shared</span>
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
