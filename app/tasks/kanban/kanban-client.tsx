'use client'
import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { WORKSPACE_STATUSES, type WorkspaceId, type Task } from '@/types'
import { Plus } from 'lucide-react'
import { TaskDialog } from '@/components/task-dialog'

interface KanbanClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280'
}

export function KanbanClient({ initialTasks, workspaceId }: KanbanClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showNew, setShowNew] = useState(false)
  const statuses = WORKSPACE_STATUSES[workspaceId]

  const columns = statuses.map(status => ({
    status,
    tasks: tasks.filter(t => t.status === status),
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

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Kanban</h1>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
        >
          <Plus className="w-4 h-4" /> New task
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 scroll-smooth snap-x snap-mandatory">
          {columns.map(col => (
            <div key={col.status} className="flex-shrink-0 w-72 sm:w-64 flex flex-col snap-start">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide">{col.status}</h2>
                <span className="text-xs text-[#6B7280] font-mono">{col.tasks.length}</span>
              </div>
              <Droppable droppableId={col.status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'flex-1 min-h-24 rounded-[8px] p-2 space-y-2 transition-colors',
                      snapshot.isDraggingOver ? 'bg-[rgba(255,255,255,0.04)]' : 'bg-transparent'
                    )}
                  >
                    {col.tasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setEditingTask(task)}
                            className={cn(
                              'p-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] cursor-pointer transition-all',
                              snapshot.isDragging && 'border-[rgba(255,255,255,0.16)] bg-[#1A1A1A]'
                            )}
                            style={{
                              ...provided.draggableProps.style,
                              borderLeftColor: PRIORITY_COLORS[task.priority ?? 'medium'],
                              borderLeftWidth: 2,
                            }}
                          >
                            <p className="text-sm font-medium text-[#F5F5F5] mb-2 leading-snug">{task.title}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {task.dueDate && (
                                <span className={cn('text-xs', isOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#6B7280]')}>
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.assignee && (
                                <span className="text-xs text-[#6B7280]">{task.assignee}</span>
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

      {(editingTask || showNew) && (
        <TaskDialog
          task={editingTask}
          workspaceId={workspaceId}
          onClose={() => { setEditingTask(null); setShowNew(false) }}
          onSave={editingTask ? (d) => handleUpdate(editingTask.id, d) : handleCreate}
          onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
        />
      )}
    </div>
  )
}
