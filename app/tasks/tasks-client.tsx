'use client'
import { useState, useMemo } from 'react'
import { Plus, Search } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { TaskDialog } from '@/components/task-dialog'
import { WORKSPACE_STATUSES, type WorkspaceId, type Task } from '@/types'
import { useRouter } from 'next/navigation'

interface TasksClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280'
}

export function TasksClient({ initialTasks, workspaceId }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showDialog, setShowDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  const statuses = WORKSPACE_STATUSES[workspaceId]

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      return true
    })
  }, [tasks, search, statusFilter])

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
          {['all', ...statuses].map(s => (
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
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              {['Title', 'Status', 'Priority', 'Due Date', 'Assignee'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#4B5563]">No tasks found</td></tr>
            ) : filtered.map(task => (
              <tr
                key={task.id}
                onClick={() => { setEditingTask(task); setShowDialog(true) }}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded-full shrink-0" style={{ backgroundColor: PRIORITY_DOT[task.priority ?? 'medium'] }} />
                    <span className="text-sm text-[#F5F5F5]">{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs capitalize" style={{ color: PRIORITY_DOT[task.priority ?? 'medium'] }}>{task.priority ?? 'medium'}</span>
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
            style={{ borderLeftColor: PRIORITY_DOT[task.priority ?? 'medium'], borderLeftWidth: 2 }}
          >
            <p className="text-sm font-medium text-[#F5F5F5] mb-2">{task.title}</p>
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
        />
      )}
    </div>
  )
}
