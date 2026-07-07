'use client'
import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { TASK_STATUSES, type WorkspaceId, type Task, type Area, type Project } from '@/types'
import { Plus, Zap, Star, Search } from 'lucide-react'
import { TaskDialog } from '@/components/task-dialog'

interface KanbanClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
  areas?: Area[]
  projects?: Project[]
}

const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']

export function KanbanClient({ initialTasks, workspaceId, areas = [], projects = [] }: KanbanClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskStatus, setNewTaskStatus] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active')
  const [urgentFilter, setUrgentFilter] = useState(false)
  const [importantFilter, setImportantFilter] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [areaFilter, setAreaFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter === 'active' && DONE_STATUSES.includes(t.status)) return false
      if (urgentFilter && !t.urgent) return false
      if (importantFilter && !t.important) return false
      if (projectFilter && t.projectId !== projectFilter) return false
      if (areaFilter && t.areaId !== areaFilter) return false
      return true
    })
  }, [tasks, search, statusFilter, urgentFilter, importantFilter, projectFilter, areaFilter])

  const statuses = [...TASK_STATUSES]
  const columns = statuses.map(status => ({
    status,
    tasks: filtered.filter(t => t.status === status),
  }))

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStatus = destination.droppableId

    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t))

    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function handleCreate(data: Partial<Task>) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    if (res.ok) {
      const task = await res.json() as Task
      setTasks(prev => [...prev, task])
    }
  }

  async function handleUpdate(id: string, data: Partial<Task>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json() as Task
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filterBtnCls = (active: boolean, color?: string) => cn(
    'flex items-center gap-1 px-2.5 py-1 text-xs rounded-none border transition-colors whitespace-nowrap',
    active
      ? color ?? 'bg-[#272018] border-[rgba(167,155,120,0.22)] text-[#E8DFCE]'
      : 'border-[rgba(167,155,120,0.13)] text-[#7A6F55] hover:text-[#A79B78]',
  )

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Kanban</h1>
        <button
          onClick={() => setNewTaskStatus('Backlog')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#272018] transition-colors"
        >
          <Plus className="w-4 h-4" /> New task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] max-w-[200px]">
          <Search className="w-3 h-3 text-[#7A6F55]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="bg-transparent text-xs text-[#E8DFCE] placeholder-[#5C5340] outline-none flex-1 w-0"
          />
        </div>
        <button onClick={() => setStatusFilter(f => f === 'active' ? 'all' : 'active')} className={filterBtnCls(statusFilter === 'all')}>
          {statusFilter === 'active' ? 'Active' : 'All'}
        </button>
        <button onClick={() => setUrgentFilter(f => !f)} className={filterBtnCls(urgentFilter, 'bg-[rgba(192,69,46,0.15)] border-[rgba(192,69,46,0.4)] text-[#C0452E]')}>
          <Zap className="w-3 h-3" /> Urgent
        </button>
        <button onClick={() => setImportantFilter(f => !f)} className={filterBtnCls(importantFilter, 'bg-[rgba(201,150,46,0.15)] border-[rgba(201,150,46,0.4)] text-[#C9962E]')}>
          <Star className="w-3 h-3" /> Important
        </button>
        {projects.length > 0 && (
          <select
            value={projectFilter ?? ''}
            onChange={e => setProjectFilter(e.target.value || null)}
            className="px-2.5 py-1 text-xs rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] text-[#A79B78] outline-none appearance-none"
          >
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {areas.length > 0 && (
          <select
            value={areaFilter ?? ''}
            onChange={e => setAreaFilter(e.target.value || null)}
            className="px-2.5 py-1 text-xs rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] text-[#A79B78] outline-none appearance-none"
          >
            <option value="">All areas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 scroll-smooth snap-x snap-mandatory">
          {columns.map(col => (
            <div key={col.status} className="flex-shrink-0 w-72 sm:w-64 flex flex-col snap-start">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold text-[#A79B78] uppercase tracking-wide flex-1">{col.status}</h2>
                <span className="text-xs text-[#7A6F55] font-mono">{col.tasks.length}</span>
                <button
                  onClick={() => setNewTaskStatus(col.status)}
                  className="w-5 h-5 flex items-center justify-center rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <Droppable droppableId={col.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 min-h-24 rounded-none p-2 space-y-2 transition-colors',
                      snapshot.isDraggingOver ? 'bg-[rgba(167,155,120,0.09)]' : 'bg-transparent'
                    )}
                  >
                    {col.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => { setEditingTask(task); setNewTaskStatus(null) }}
                            className={cn(
                              'p-3 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] cursor-pointer transition-all',
                              snapshot.isDragging && 'border-[rgba(167,155,120,0.35)] bg-[#201A14]'
                            )}
                            style={provided.draggableProps.style}
                          >
                            <p className="text-sm font-medium text-[#E8DFCE] mb-2 leading-snug">{task.title}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {task.urgent && (
                                <span className="flex items-center gap-0.5 text-xs text-[#C0452E]">
                                  <Zap className="w-3 h-3" /> Urgent
                                </span>
                              )}
                              {task.important && (
                                <span className="flex items-center gap-0.5 text-xs text-[#C9962E]">
                                  <Star className="w-3 h-3" /> Important
                                </span>
                              )}
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
          ))}
        </div>
      </DragDropContext>

      {(editingTask || newTaskStatus !== null) && (
        <TaskDialog
          task={editingTask}
          workspaceId={workspaceId}
          defaultStatus={newTaskStatus ?? undefined}
          onClose={() => { setEditingTask(null); setNewTaskStatus(null) }}
          onSave={editingTask ? (d) => handleUpdate(editingTask.id, d) : handleCreate}
          onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
          areas={areas}
          projects={projects}
        />
      )}
    </div>
  )
}
