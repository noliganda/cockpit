'use client'
import { useState, useMemo } from 'react'
import { Plus, Search, Zap, Star } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { TaskDialog } from '@/components/task-dialog'
import { TASK_STATUSES, type WorkspaceId, type Task, type Area, type Project, type Sprint } from '@/types'
import { useRouter } from 'next/navigation'

interface TasksClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
  areas?: Area[]
  projects?: Project[]
  sprints?: Sprint[]
}

export function TasksClient({ initialTasks, workspaceId, areas = [], projects = [], sprints = [] }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [urgentFilter, setUrgentFilter] = useState(false)
  const [importantFilter, setImportantFilter] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (urgentFilter && !t.urgent) return false
      if (importantFilter && !t.important) return false
      return true
    })
  }, [tasks, search, statusFilter, urgentFilter, importantFilter])

  async function handleCreate(data: Partial<Task>) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    if (res.ok) {
      const task = await res.json() as Task
      setTasks(prev => [task, ...prev])
      router.refresh()
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

  async function toggleFlag(e: React.MouseEvent, task: Task, field: 'urgent' | 'important') {
    e.stopPropagation()
    const newVal = !task[field]
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, [field]: newVal } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newVal }),
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Tasks</h1>
        <button
          onClick={() => { setEditingTask(null); setShowDialog(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#6B7280]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter tasks..."
            className="bg-transparent text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none flex-1"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', ...TASK_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
                statusFilter === s
                  ? 'bg-[#222222] border-[rgba(255,255,255,0.10)] text-[#F5F5F5]'
                  : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
              )}
            >{s === 'all' ? 'All' : s}</button>
          ))}
          <button
            onClick={() => setUrgentFilter(f => !f)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
              urgentFilter
                ? 'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.4)] text-[#EF4444]'
                : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
            )}
          >
            <Zap className="w-3 h-3" />
            Urgent
          </button>
          <button
            onClick={() => setImportantFilter(f => !f)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
              importantFilter
                ? 'bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.4)] text-[#F59E0B]'
                : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
            )}
          >
            <Star className="w-3 h-3" />
            Important
          </button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Title</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wide w-10">⚡</th>
              <th className="px-2 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wide w-10">⭐</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#4B5563]">No tasks found</td></tr>
            ) : filtered.map(task => (
              <tr
                key={task.id}
                onClick={() => { setEditingTask(task); setShowDialog(true) }}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <span className="text-sm text-[#F5F5F5]">{task.title}</span>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={e => toggleFlag(e, task, 'urgent')}
                    title="Toggle Urgent"
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-[4px] transition-colors mx-auto',
                      task.urgent
                        ? 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]'
                        : 'text-[#4B5563] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]'
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={e => toggleFlag(e, task, 'important')}
                    title="Toggle Important"
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-[4px] transition-colors mx-auto',
                      task.important
                        ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]'
                        : 'text-[#4B5563] hover:text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)]'
                    )}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn('text-xs', isOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#6B7280]')}>
                    {task.dueDate ? formatDate(task.dueDate) : '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-[#6B7280]">{task.assignee ?? '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-[#4B5563] py-12">No tasks found</p>
        ) : filtered.map(task => (
          <div
            key={task.id}
            onClick={() => { setEditingTask(task); setShowDialog(true) }}
            className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2 gap-2">
              <p className="text-sm font-medium text-[#F5F5F5] flex-1">{task.title}</p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={e => toggleFlag(e, task, 'urgent')}
                  className={cn('p-1 rounded transition-colors', task.urgent ? 'text-[#EF4444]' : 'text-[#4B5563]')}
                >
                  <Zap className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => toggleFlag(e, task, 'important')}
                  className={cn('p-1 rounded transition-colors', task.important ? 'text-[#F59E0B]' : 'text-[#4B5563]')}
                >
                  <Star className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
              {task.dueDate && <span className={cn('text-xs', isOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#6B7280]')}>{formatDate(task.dueDate)}</span>}
              {task.assignee && <span className="text-xs text-[#6B7280]">{task.assignee}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Task dialog */}
      {showDialog && (
        <TaskDialog
          task={editingTask}
          workspaceId={workspaceId}
          onClose={() => { setShowDialog(false); setEditingTask(null) }}
          onSave={editingTask ? (d) => handleUpdate(editingTask.id, d) : handleCreate}
          onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
          areas={areas}
          projects={projects}
          sprints={sprints}
        />
      )}
    </div>
  )
}
