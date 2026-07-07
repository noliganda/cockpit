'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Zap, Star } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { SprintBurndown } from './sprint-burndown'
import type { Sprint, Task } from '@/types'

const KANBAN_COLUMNS = ['To Do', 'In Progress', 'Done'] as const
type KanbanColumn = typeof KANBAN_COLUMNS[number]

const DONE_STATUSES = ['Delivered', 'Won', 'Completed', 'Paid', 'Done']

function isSprintDone(task: Task): boolean {
  return DONE_STATUSES.includes(task.status)
}

function mapStatusToKanban(status: string): KanbanColumn {
  if (DONE_STATUSES.includes(status)) return 'Done'
  if (status === 'In Progress' || status === 'Needs Review' || status === 'Pre-Prod' || status === 'In Prod' || status === 'Post-Prod' || status === 'Review') return 'In Progress'
  return 'To Do'
}

function kanbanStatusToTaskStatus(col: KanbanColumn): string {
  if (col === 'To Do') return 'To Do'
  if (col === 'In Progress') return 'In Progress'
  return 'Done'
}

interface SprintDetailClientProps {
  sprint: Sprint
  sprintTasks: Task[]
  backlogTasks: Task[]
  workspaceId: string
}

interface TaskCardProps {
  task: Task
  index: number
}

function TaskCard({ task, index }: TaskCardProps) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 rounded-none bg-[#1A1510] border transition-all select-none ${
            snapshot.isDragging
              ? 'border-[rgba(167,155,120,0.35)] opacity-95'
              : 'border-[rgba(167,155,120,0.13)] hover:border-[rgba(167,155,120,0.22)]'
          }`}
        >
          <p className="text-sm text-[#E8DFCE] leading-snug mb-1">{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {task.assignee && (
              <span className="text-xs text-[#7A6F55]">{task.assignee}</span>
            )}
            {task.urgent && (
              <Zap className="w-3 h-3 text-[#C9962E]" />
            )}
            {task.important && (
              <Star className="w-3 h-3 text-[#5F7A72]" />
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}

export function SprintDetailClient({ sprint, sprintTasks: initialSprintTasks, backlogTasks: initialBacklogTasks, workspaceId }: SprintDetailClientProps) {
  const [sprintTasks, setSprintTasks] = useState<Task[]>(initialSprintTasks)
  const [backlogTasks, setBacklogTasks] = useState<Task[]>(initialBacklogTasks)
  const [search, setSearch] = useState('')

  const filteredBacklog = useMemo(() => {
    if (!search.trim()) return backlogTasks
    const q = search.toLowerCase()
    return backlogTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.assignee?.toLowerCase().includes(q) ?? false)
    )
  }, [backlogTasks, search])

  const completedCount = sprintTasks.filter(t => isSprintDone(t)).length
  const totalCount = sprintTasks.length

  async function patchTask(id: string, patch: Partial<Task>) {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch {
      // silent — optimistic update already applied
    }
  }

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const srcId = source.droppableId
    const dstId = destination.droppableId

    // Moving within the same kanban column — reorder only
    if (srcId === dstId && KANBAN_COLUMNS.includes(srcId as KanbanColumn)) {
      setSprintTasks(prev => {
        const colTasks = prev.filter(t => mapStatusToKanban(t.status) === srcId)
        const otherTasks = prev.filter(t => mapStatusToKanban(t.status) !== srcId)
        const [moved] = colTasks.splice(source.index, 1)
        colTasks.splice(destination.index, 0, moved)
        return [...otherTasks, ...colTasks]
      })
      return
    }

    // Moving from backlog to a kanban column → add to sprint
    if (srcId === 'backlog' && KANBAN_COLUMNS.includes(dstId as KanbanColumn)) {
      const task = backlogTasks.find(t => t.id === draggableId)
      if (!task) return

      const newStatus = kanbanStatusToTaskStatus(dstId as KanbanColumn)
      const updatedTask: Task = { ...task, sprintId: sprint.id, status: newStatus }

      setBacklogTasks(prev => prev.filter(t => t.id !== draggableId))
      setSprintTasks(prev => {
        const colTasks = prev.filter(t => mapStatusToKanban(t.status) === dstId)
        const otherTasks = prev.filter(t => mapStatusToKanban(t.status) !== dstId)
        colTasks.splice(destination.index, 0, updatedTask)
        return [...otherTasks, ...colTasks]
      })

      patchTask(task.id, { sprintId: sprint.id, status: newStatus })
      return
    }

    // Moving from a kanban column to backlog → remove from sprint
    if (KANBAN_COLUMNS.includes(srcId as KanbanColumn) && dstId === 'backlog') {
      const task = sprintTasks.find(t => t.id === draggableId)
      if (!task) return

      const updatedTask: Task = { ...task, sprintId: null }

      setSprintTasks(prev => prev.filter(t => t.id !== draggableId))
      setBacklogTasks(prev => {
        const next = [...prev]
        next.splice(destination.index, 0, updatedTask)
        return next
      })

      patchTask(task.id, { sprintId: null })
      return
    }

    // Moving between kanban columns → update status
    if (KANBAN_COLUMNS.includes(srcId as KanbanColumn) && KANBAN_COLUMNS.includes(dstId as KanbanColumn)) {
      const task = sprintTasks.find(t => t.id === draggableId)
      if (!task) return

      const newStatus = kanbanStatusToTaskStatus(dstId as KanbanColumn)
      const updatedTask: Task = { ...task, status: newStatus }

      setSprintTasks(prev => {
        const withoutMoved = prev.filter(t => t.id !== draggableId)
        const colTasks = withoutMoved.filter(t => mapStatusToKanban(t.status) === dstId)
        const otherTasks = withoutMoved.filter(t => mapStatusToKanban(t.status) !== dstId)
        colTasks.splice(destination.index, 0, updatedTask)
        return [...otherTasks, ...colTasks]
      })

      patchTask(task.id, { status: newStatus })
      return
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-[rgba(167,155,120,0.13)]">
          <Link
            href={`/sprints?workspace=${workspaceId}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#7A6F55] hover:text-[#E8DFCE] mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sprints
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#E8DFCE] tracking-tight">{sprint.name}</h1>
              {sprint.goal && <p className="text-sm text-[#A79B78] mt-0.5">{sprint.goal}</p>}
            </div>
            {sprint.status && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(167,155,120,0.13)] text-[#A79B78]">
                {sprint.status}
              </span>
            )}
          </div>
        </div>

        {/* Main split layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left panel — Backlog */}
          <div className="w-72 shrink-0 flex flex-col bg-[#14100C] border-r border-[rgba(167,155,120,0.13)]">
            <div className="p-4 border-b border-[rgba(167,155,120,0.13)]">
              <h2 className="text-xs font-semibold text-[#A79B78] uppercase tracking-wide mb-3">
                Backlog
                <span className="ml-1.5 font-mono text-[#7A6F55]">({backlogTasks.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5C5340]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-none bg-[#201A14] border border-[rgba(167,155,120,0.13)] text-sm text-[#E8DFCE] placeholder:text-[#5C5340] focus:outline-none focus:border-[rgba(167,155,120,0.31)] transition-colors"
                />
              </div>
            </div>

            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 overflow-y-auto p-4 space-y-2 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-[rgba(167,155,120,0.04)]' : ''
                  }`}
                >
                  {filteredBacklog.length === 0 ? (
                    <p className="text-xs text-[#5C5340] text-center py-8">
                      {search ? 'No matches' : 'No backlog tasks'}
                    </p>
                  ) : (
                    filteredBacklog.map((task, index) => (
                      <TaskCard key={task.id} task={task} index={index} />
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Right panel — Sprint board */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Burndown chart */}
            {totalCount > 0 && (
              <div className="flex-shrink-0 p-4 border-b border-[rgba(167,155,120,0.13)]">
                <SprintBurndown
                  totalTasks={totalCount}
                  completedTasks={completedCount}
                  startDate={sprint.startDate}
                  endDate={sprint.endDate}
                />
              </div>
            )}

            {/* Kanban columns */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex gap-4 h-full min-w-max">
                {KANBAN_COLUMNS.map(col => {
                  const colTasks = sprintTasks.filter(t => mapStatusToKanban(t.status) === col)
                  return (
                    <div key={col} className="flex-shrink-0 w-56 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xs font-semibold text-[#A79B78] uppercase tracking-wide">
                          {col}
                        </h3>
                        <span className="text-xs text-[#7A6F55] font-mono">{colTasks.length}</span>
                      </div>

                      <Droppable droppableId={col}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 min-h-[80px] rounded-none p-2 space-y-2 transition-colors ${
                              snapshot.isDraggingOver
                                ? 'bg-[rgba(167,155,120,0.09)] border border-[rgba(167,155,120,0.18)]'
                                : 'bg-[rgba(167,155,120,0.04)] border border-[rgba(167,155,120,0.09)]'
                            }`}
                          >
                            {colTasks.map((task, index) => (
                              <TaskCard key={task.id} task={task} index={index} />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DragDropContext>
  )
}
