'use client'
import { useState, useMemo } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { WORKSPACES, type WorkspaceId, type Task } from '@/types'

interface MatrixClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
}

const QUADRANTS = [
  {
    id: 'do-first',
    label: '🚨 Do First',
    subtitle: 'Urgent + Important',
    urgent: true,
    important: true,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.20)',
  },
  {
    id: 'schedule',
    label: '⭐ Schedule',
    subtitle: 'Important, not urgent',
    urgent: false,
    important: true,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.20)',
  },
  {
    id: 'delegate',
    label: '⚡ Delegate',
    subtitle: 'Urgent, not important',
    urgent: true,
    important: false,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.20)',
  },
  {
    id: 'eliminate',
    label: '🗑 Eliminate',
    subtitle: 'Neither urgent nor important',
    urgent: false,
    important: false,
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.06)',
    border: 'rgba(107,114,128,0.15)',
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

export function MatrixClient({ initialTasks, workspaceId }: MatrixClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const workspace = WORKSPACES.find(w => w.id === workspaceId)!

  const tasksByQuadrant = useMemo(() => {
    const map: Record<string, Task[]> = {
      'do-first': [],
      'schedule': [],
      'delegate': [],
      'eliminate': [],
    }
    tasks.forEach(t => {
      const qId = getQuadrantId(t)
      map[qId].push(t)
    })
    return map
  }, [tasks])

  async function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const destQuadrant = QUADRANTS.find(q => q.id === destination.droppableId)
    if (!destQuadrant) return

    const { urgent, important } = destQuadrant

    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === draggableId ? { ...t, urgent, important } : t
    ))

    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urgent, important }),
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Eisenhower Matrix</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Drag tasks between quadrants to set urgency and importance</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color }} />
          <span className="text-xs text-[#A0A0A0]">{workspace.name}</span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUADRANTS.map(quadrant => {
            const qtasks = tasksByQuadrant[quadrant.id] ?? []
            return (
              <div
                key={quadrant.id}
                className="rounded-[8px] border overflow-hidden flex flex-col min-h-[280px]"
                style={{ borderColor: quadrant.border, backgroundColor: quadrant.bg }}
              >
                {/* Quadrant header */}
                <div className="px-4 py-3 border-b" style={{ borderColor: quadrant.border }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: quadrant.color }}>{quadrant.label}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{quadrant.subtitle}</p>
                    </div>
                    <span className="text-xs font-mono text-[#A0A0A0] bg-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded-full">
                      {qtasks.length}
                    </span>
                  </div>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={quadrant.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-1 p-3 space-y-2 transition-colors min-h-[200px]',
                        snapshot.isDraggingOver && 'bg-[rgba(255,255,255,0.03)]'
                      )}
                    >
                      {qtasks.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-[#4B5563] text-center pt-8">Drop tasks here</p>
                      )}
                      {qtasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'p-3 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] cursor-grab active:cursor-grabbing transition-all',
                                snapshot.isDragging && 'shadow-lg border-[rgba(255,255,255,0.12)] bg-[#1A1A1A]'
                              )}
                            >
                              <p className="text-sm text-[#F5F5F5] font-medium leading-snug mb-1.5">{task.title}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">
                                  {task.status}
                                </span>
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
            )
          })}
        </div>
      </DragDropContext>
    </div>
  )
}
