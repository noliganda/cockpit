'use client'
import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { WORKSPACES, TASK_STATUSES, type WorkspaceId, type Task, type Area, type Project } from '@/types'
import { Search } from 'lucide-react'

interface MatrixClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
  areas?: Area[]
  projects?: Project[]
}

const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']

const QUADRANTS = [
  {
    id: 'do-first',
    label: 'Do First',
    subtitle: 'Urgent + Important',
    urgent: true,
    important: true,
    color: '#C0452E',
    bg: 'rgba(192,69,46,0.08)',
    border: 'rgba(192,69,46,0.20)',
  },
  {
    id: 'schedule',
    label: 'Schedule',
    subtitle: 'Important, not urgent',
    urgent: false,
    important: true,
    color: '#5F7A72',
    bg: 'rgba(95,122,114,0.08)',
    border: 'rgba(95,122,114,0.20)',
  },
  {
    id: 'delegate',
    label: 'Delegate',
    subtitle: 'Urgent, not important',
    urgent: true,
    important: false,
    color: '#C9962E',
    bg: 'rgba(201,150,46,0.08)',
    border: 'rgba(201,150,46,0.20)',
  },
  {
    id: 'eliminate',
    label: 'Eliminate',
    subtitle: 'Neither urgent nor important',
    urgent: false,
    important: false,
    color: '#7A6F55',
    bg: 'rgba(122,111,85,0.06)',
    border: 'rgba(122,111,85,0.15)',
  },
]

function getQuadrantId(task: Task): string {
  const u = !!task.urgent
  const i = !!task.important
  if (u && i) return 'do-first'
  if (!u && i) return 'schedule'
  if (u && !i) return 'delegate'
  return 'eliminate'
}

export function MatrixClient({ initialTasks, workspaceId, areas = [], projects = [] }: MatrixClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const workspace = WORKSPACES.find(w => w.id === workspaceId)!

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | string>('active')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [areaFilter, setAreaFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter === 'active' && DONE_STATUSES.includes(t.status)) return false
      else if (statusFilter !== 'active' && statusFilter !== 'all' && t.status !== statusFilter) return false
      if (projectFilter && t.projectId !== projectFilter) return false
      if (areaFilter && t.areaId !== areaFilter) return false
      return true
    })
  }, [tasks, search, statusFilter, projectFilter, areaFilter])

  const tasksByQuadrant = useMemo(() => {
    const map: Record<string, Task[]> = {
      'do-first': [],
      'schedule': [],
      'delegate': [],
      'eliminate': [],
    }
    filtered.forEach(t => {
      const qId = getQuadrantId(t)
      map[qId].push(t)
    })
    return map
  }, [filtered])

  async function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const destQuadrant = QUADRANTS.find(q => q.id === destination.droppableId)
    if (!destQuadrant) return

    const { urgent, important } = destQuadrant

    setTasks(prev => prev.map(t =>
      t.id === draggableId ? { ...t, urgent, important } : t
    ))

    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urgent, important }),
    })
  }

  const filterBtnCls = (active: boolean, color?: string) => cn(
    'px-2.5 py-1 text-xs rounded-none border transition-colors whitespace-nowrap',
    active
      ? color ?? 'bg-[#2F241A] border-[rgba(167,155,120,0.22)] text-[#E8DFCE]'
      : 'border-[rgba(167,155,120,0.13)] text-[#7A6F55] hover:text-[#A79B78]',
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div>
          <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Eisenhower Matrix</h1>
          <p className="text-xs text-[#7A6F55] mt-0.5">Drag tasks between quadrants to set urgency and importance</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color }} />
          <span className="text-xs text-[#A79B78]">{workspace.name}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] max-w-[200px]">
          <Search className="w-3 h-3 text-[#7A6F55]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="bg-transparent text-xs text-[#E8DFCE] placeholder-[#5C5340] outline-none flex-1 w-0"
          />
        </div>
        {['active', 'all', ...TASK_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={filterBtnCls(statusFilter === s)}
          >
            {s === 'active' ? 'Active' : s === 'all' ? 'All' : s}
          </button>
        ))}
        {projects.length > 0 && (
          <select
            value={projectFilter ?? ''}
            onChange={e => setProjectFilter(e.target.value || null)}
            className="px-2.5 py-1 text-xs rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] text-[#A79B78] outline-none appearance-none"
          >
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {areas.length > 0 && (
          <select
            value={areaFilter ?? ''}
            onChange={e => setAreaFilter(e.target.value || null)}
            className="px-2.5 py-1 text-xs rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] text-[#A79B78] outline-none appearance-none"
          >
            <option value="">All areas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {/* Matrix grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUADRANTS.map(quadrant => {
            const qtasks = tasksByQuadrant[quadrant.id] ?? []
            return (
              <div
                key={quadrant.id}
                className="rounded-none border overflow-hidden flex flex-col min-h-[280px]"
                style={{ borderColor: quadrant.border, backgroundColor: quadrant.bg }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: quadrant.border }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: quadrant.color }}>{quadrant.label}</p>
                      <p className="text-xs text-[#7A6F55] mt-0.5">{quadrant.subtitle}</p>
                    </div>
                    <span className="text-xs font-mono text-[#A79B78] bg-[rgba(167,155,120,0.13)] px-2 py-0.5 rounded-full">
                      {qtasks.length}
                    </span>
                  </div>
                </div>

                <Droppable droppableId={quadrant.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-1 p-3 space-y-2 transition-colors min-h-[200px]',
                        snapshot.isDraggingOver && 'bg-[rgba(167,155,120,0.07)]'
                      )}
                    >
                      {qtasks.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-[#5C5340] text-center pt-8">Drop tasks here</p>
                      )}
                      {qtasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'p-3 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] cursor-grab active:cursor-grabbing transition-all',
                                snapshot.isDragging && ' border-[rgba(167,155,120,0.26)] bg-[#281E16]'
                              )}
                            >
                              <p className="text-sm text-[#E8DFCE] font-medium leading-snug mb-1.5">{task.title}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(167,155,120,0.13)] text-[#A79B78]">
                                  {task.status}
                                </span>
                                {task.dueDate && (
                                  <span className={cn('text-xs', isOverdue(task.dueDate) ? 'text-[#C0452E]' : 'text-[#7A6F55]')}>
                                    {formatDate(task.dueDate)}
                                  </span>
                                )}
                                {task.assignee && (
                                  <span className="text-xs text-[#7A6F55]">{task.assignee}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
