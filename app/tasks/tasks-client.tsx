'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Search, Zap, Star, Download, Trash2, X, Check, ChevronDown, ListTree, Inbox } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { TaskDialog } from '@/components/task-dialog'
import { CustomCheckbox } from '@/components/custom-checkbox'
import { TASK_STATUSES, type WorkspaceId, type Task, type Area, type Project, type Sprint } from '@/types'
import { useRouter } from 'next/navigation'
import { GroupToggle, CollapsibleGroup, getSavedGrouping } from '@/components/group-toggle'
import { groupTasksBy, type GroupingProperty } from '@/lib/task-grouping'
import { ExpandChevron, RollupBadge, SubtaskExpansion, SubtaskCards, useSubtaskExpansion } from '@/components/subtask-row'
import { IntakeDialog } from '@/components/intake-dialog'

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface TasksClientProps {
  initialTasks: Task[]
  workspaceId: WorkspaceId
  initialStatusFilter?: string
  areas?: Area[]
  projects?: Project[]
  sprints?: Sprint[]
  users?: UserOption[]
}

function statusColor(status: string) {
  switch (status) {
    case 'Done': return 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]'
    case 'In Progress': return 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]'
    case 'Needs Review': return 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]'
    case 'Cancelled': return 'text-[#6B7280] bg-[rgba(107,114,128,0.08)]'
    default: return 'text-[#A0A0A0] bg-[rgba(255,255,255,0.06)]'
  }
}

// Portal dropdown — bypasses overflow:hidden on the table container
function PortalDropdown({
  anchorRef,
  isOpen,
  onClose,
  children,
  minWidth = 140,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  minWidth?: number
}) {
  if (!isOpen || typeof document === 'undefined') return null
  const rect = anchorRef.current?.getBoundingClientRect()
  if (!rect) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[6px] overflow-hidden shadow-lg"
        style={{ top: rect.bottom + 4, left: rect.left, minWidth }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}

// Inline status — clickable badge opens a portal dropdown
function InlineStatus({ task, onUpdate }: { task: Task; onUpdate: (id: string, data: Partial<Task>) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={cn('text-xs px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity', statusColor(task.status))}
      >
        {task.status}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>
      <PortalDropdown anchorRef={btnRef} isOpen={open} onClose={() => setOpen(false)}>
        {TASK_STATUSES.map(s => (
          <button
            key={s}
            onClick={async () => { setOpen(false); await onUpdate(task.id, { status: s }) }}
            className={cn(
              'w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] transition-colors flex items-center gap-2',
              task.status === s ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]'
            )}
          >
            {task.status === s ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />}
            {s}
          </button>
        ))}
      </PortalDropdown>
    </div>
  )
}

// Inline due date — click to reveal a date input
function InlineDueDate({ task, onUpdate }: { task: Task; onUpdate: (id: string, data: Partial<Task>) => Promise<void> }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={task.dueDate ?? ''}
        autoFocus
        onClick={e => e.stopPropagation()}
        onBlur={async e => {
          setEditing(false)
          const newVal = e.target.value || null
          if (newVal !== (task.dueDate ?? null)) {
            await onUpdate(task.id, { dueDate: newVal })
          }
        }}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
        className="text-xs bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[4px] px-1 py-0.5 outline-none w-32"
      />
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true) }}
      className={cn('text-xs hover:underline transition-colors text-left', isOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#6B7280] hover:text-[#A0A0A0]')}
    >
      {task.dueDate ? formatDate(task.dueDate) : <span className="text-[#4B5563]">—</span>}
    </button>
  )
}

// Inline assignee — click to open portal dropdown
function InlineAssignee({ task, users, onUpdate }: { task: Task; users: UserOption[]; onUpdate: (id: string, data: Partial<Task>) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className="text-xs text-[#6B7280] hover:text-[#A0A0A0] transition-colors flex items-center gap-1"
      >
        {task.assigneeName
          ? `${task.assigneeType === 'agent' ? '🤖' : '🧑'} ${task.assigneeName}`
          : '—'}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>
      <PortalDropdown anchorRef={btnRef} isOpen={open} onClose={() => setOpen(false)} minWidth={160}>
        <button
          onClick={async () => { setOpen(false); await onUpdate(task.id, { assignee: null }) }}
          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2 text-[#6B7280]"
        >
          {!task.assignee ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />}
          — Unassigned
        </button>
        {users.map(u => {
          const label = u.name ?? u.email
          const isSelected = task.assignee === label
          return (
            <button
              key={u.id}
              onClick={async () => { setOpen(false); await onUpdate(task.id, { assignee: label }) }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2',
                isSelected ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]'
              )}
            >
              {isSelected ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />}
              {label}
            </button>
          )
        })}
      </PortalDropdown>
    </div>
  )
}

export function TasksClient({ initialTasks, workspaceId, initialStatusFilter, areas = [], projects = [], sprints = [], users = [] }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter ?? 'active')
  const [urgentFilter, setUrgentFilter] = useState(false)
  const [importantFilter, setImportantFilter] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [areaFilter, setAreaFilter] = useState<string | null>(null)
  const [orphanFilter, setOrphanFilter] = useState(false)

  // Grouping
  const [grouping, setGrouping] = useState<GroupingProperty>('none')
  useEffect(() => { setGrouping(getSavedGrouping()) }, [])

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects])

  // Filter dropdown refs
  const projectFilterRef = useRef<HTMLButtonElement>(null)
  const areaFilterRef = useRef<HTMLButtonElement>(null)
  const [projectFilterOpen, setProjectFilterOpen] = useState(false)
  const [areaFilterOpen, setAreaFilterOpen] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [parentForSubtask, setParentForSubtask] = useState<Task | null>(null)
  const [showIntake, setShowIntake] = useState(false)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchStatusOpen, setBatchStatusOpen] = useState(false)
  const [batchAssigneeOpen, setBatchAssigneeOpen] = useState(false)
  const batchStatusRef = useRef<HTMLButtonElement>(null)
  const batchAssigneeRef = useRef<HTMLButtonElement>(null)

  const router = useRouter()

  // Hierarchy expand/collapse
  const { expandedIds, toggle: toggleExpand, rollups, setRollup } = useSubtaskExpansion()
  // Track which parent tasks have children (loaded lazily via rollup fetch)
  const [parentFlags, setParentFlags] = useState<Map<string, boolean>>(new Map())
  // Increment to force SubtaskExpansion to re-fetch children
  const [subtaskRefreshKey, setSubtaskRefreshKey] = useState(0)

  const todayStr = new Date().toISOString().split('T')[0]
  const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid']

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter === 'active' && DONE_STATUSES.includes(t.status)) return false
      else if (statusFilter === 'overdue') {
        if (DONE_STATUSES.includes(t.status)) return false
        if (!t.dueDate || t.dueDate >= todayStr) return false
      } else if (statusFilter !== 'all' && statusFilter !== 'active' && t.status !== statusFilter) return false
      if (urgentFilter && !t.urgent) return false
      if (importantFilter && !t.important) return false
      if (projectFilter && t.projectId !== projectFilter) return false
      if (areaFilter && t.areaId !== areaFilter) return false
      if (orphanFilter && (t.projectId || t.areaId)) return false
      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, statusFilter, urgentFilter, importantFilter, projectFilter, areaFilter, orphanFilter])

  const groups = useMemo(() => {
    if (grouping === 'none') return null
    const keyFn = (t: Task) => {
      switch (grouping) {
        case 'project': return t.projectId ? (projectMap.get(t.projectId) ?? 'Unknown') : 'No Project'
        case 'status':  return t.status
        case 'assignee': return t.assignee ?? 'Unassigned'
        case 'area':    return t.areaId ? (areas.find(a => a.id === t.areaId)?.name ?? 'Unknown') : 'No Area'
        default:        return 'All'
      }
    }
    return groupTasksBy(filtered, keyFn)
  }, [filtered, grouping, projectMap, areas])

  const selectedCount = selectedIds.size
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id))

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)))
    }
    setLastClickedIdx(null)
  }

  function toggleSelect(e: React.MouseEvent, idx: number, taskId: string) {
    e.stopPropagation()
    if (e.shiftKey && lastClickedIdx !== null) {
      const from = Math.min(lastClickedIdx, idx)
      const to = Math.max(lastClickedIdx, idx)
      const rangeIds = filtered.slice(from, to + 1).map(t => t.id)
      const newSet = new Set(selectedIds)
      rangeIds.forEach(id => newSet.add(id))
      setSelectedIds(newSet)
    } else {
      const newSet = new Set(selectedIds)
      if (newSet.has(taskId)) newSet.delete(taskId)
      else newSet.add(taskId)
      setSelectedIds(newSet)
      setLastClickedIdx(idx)
    }
  }

  function exportMarkdown() {
    const date = new Date().toISOString().slice(0, 10)
    const lines: string[] = [
      '---', `workspace: ${workspaceId}`, `exported: ${date}`, `total: ${filtered.length}`, '---', '',
      `# Tasks — ${workspaceId}`, '',
    ]
    for (const t of filtered) {
      lines.push(`## ${t.title}`)
      lines.push(`- **Status:** ${t.status}`)
      if (t.priority) lines.push(`- **Priority:** ${t.priority}`)
      if (t.dueDate) lines.push(`- **Due:** ${t.dueDate}`)
      if (t.assignee) lines.push(`- **Assignee:** ${t.assignee}`)
      if (t.urgent) lines.push('- **Urgent:** Yes')
      if (t.important) lines.push('- **Important:** Yes')
      if (t.tags?.length) lines.push(`- **Tags:** ${t.tags.join(', ')}`)
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `tasks-${workspaceId}-${date}.md`
    a.click()
  }

  async function handleCreate(data: Partial<Task>) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    if (res.ok) {
      const task = await res.json() as Task
      if (task.parentTaskId) {
        // Subtask created — don't add to top-level list.
        // Instead, refresh the parent's subtask expansion and ensure it's expanded.
        setSubtaskRefreshKey(k => k + 1)
        setParentFlags(prev => { const next = new Map(prev); next.set(task.parentTaskId!, true); return next })
        if (!expandedIds.has(task.parentTaskId)) {
          toggleExpand(task.parentTaskId)
        }
      } else {
        // Top-level task — add to list
        setTasks(prev => [task, ...prev])
      }
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

  // Batch operations
  async function batchUpdate(updates: Record<string, unknown>) {
    const ids = Array.from(selectedIds)
    setTasks(prev => prev.map(t => selectedIds.has(t.id) ? { ...t, ...updates } : t))
    await fetch('/api/tasks/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates }),
    })
  }

  async function batchDelete() {
    const ids = Array.from(selectedIds)
    setTasks(prev => prev.filter(t => !selectedIds.has(t.id)))
    setSelectedIds(new Set())
    setShowDeleteConfirm(false)
    await fetch('/api/tasks/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }

  async function batchToggle(field: 'urgent' | 'important') {
    const selectedTasks = tasks.filter(t => selectedIds.has(t.id))
    const allActive = selectedTasks.every(t => t[field])
    await batchUpdate({ [field]: !allActive })
  }

  // ─── Extracted row/card renderers (used by both grouped + ungrouped views) ──

  function TaskRow({ task, idx }: { task: Task; idx: number }) {
    return (
      <tr
        onClick={() => { setEditingTask(task); setShowDialog(true) }}
        className={cn(
          'border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer transition-colors',
          selectedIds.has(task.id) && 'bg-[rgba(255,255,255,0.03)]'
        )}
      >
        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
          <CustomCheckbox
            checked={selectedIds.has(task.id)}
            onClick={e => toggleSelect(e as React.MouseEvent, idx, task.id)}
          />
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <ExpandChevron
              expanded={expandedIds.has(task.id)}
              hasChildren={parentFlags.get(task.id) ?? false}
              onClick={() => toggleExpand(task.id)}
            />
            <span className="text-sm text-[#F5F5F5]">{task.title}</span>
            {rollups.has(task.id) && (
              <RollupBadge rollup={rollups.get(task.id)!} />
            )}
          </div>
        </td>
        <td className="px-4 py-2.5">
          {task.projectId ? (
            <button
              onClick={e => { e.stopPropagation(); setProjectFilter(task.projectId ?? null) }}
              className="text-xs px-2 py-0.5 rounded-[4px] bg-[rgba(59,130,246,0.10)] text-[#60A5FA] hover:bg-[rgba(59,130,246,0.20)] transition-colors truncate max-w-[120px] block"
              title={projects.find(p => p.id === task.projectId)?.name}
            >
              {projects.find(p => p.id === task.projectId)?.name ?? '…'}
            </button>
          ) : (
            <span className="text-xs text-[#374151]">—</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          {task.areaId ? (
            <button
              onClick={e => { e.stopPropagation(); setAreaFilter(task.areaId ?? null) }}
              className="text-xs px-2 py-0.5 rounded-[4px] bg-[rgba(139,92,246,0.10)] text-[#A78BFA] hover:bg-[rgba(139,92,246,0.20)] transition-colors truncate max-w-[120px] block"
              title={areas.find(a => a.id === task.areaId)?.name}
            >
              {areas.find(a => a.id === task.areaId)?.name ?? '…'}
            </button>
          ) : (
            <span className="text-xs text-[#374151]">—</span>
          )}
        </td>
        <td className="px-2 py-2.5 text-center">
          <button
            onClick={e => toggleFlag(e, task, 'urgent')}
            title="Toggle Urgent"
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-[4px] transition-colors mx-auto',
              task.urgent ? 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]' : 'text-[#4B5563] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]'
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
              task.important ? 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]' : 'text-[#4B5563] hover:text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)]'
            )}
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        </td>
        <td className="px-4 py-2.5">
          <InlineStatus task={task} onUpdate={handleUpdate} />
        </td>
        <td className="px-4 py-2.5">
          <InlineDueDate task={task} onUpdate={handleUpdate} />
        </td>
        <td className="px-4 py-2.5">
          <InlineAssignee task={task} users={users} onUpdate={handleUpdate} />
        </td>
      </tr>
    )
  }

  function TaskCard({ task, idx }: { task: Task; idx: number }) {
    return (
      <div
        className={cn(
          'p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]',
          selectedIds.has(task.id) && 'border-[rgba(255,255,255,0.10)] bg-[#1A1A1A]'
        )}
      >
        <div className="flex items-start gap-2 mb-2">
          <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            <CustomCheckbox
              checked={selectedIds.has(task.id)}
              onClick={e => toggleSelect(e as React.MouseEvent, idx, task.id)}
            />
          </div>
          <p
            className="text-sm font-medium text-[#F5F5F5] flex-1 cursor-pointer"
            onClick={() => { setEditingTask(task); setShowDialog(true) }}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={e => toggleFlag(e, task, 'urgent')} className={cn('p-1 rounded transition-colors', task.urgent ? 'text-[#EF4444]' : 'text-[#4B5563]')}>
              <Zap className="w-3.5 h-3.5" />
            </button>
            <button onClick={e => toggleFlag(e, task, 'important')} className={cn('p-1 rounded transition-colors', task.important ? 'text-[#F59E0B]' : 'text-[#4B5563]')}>
              <Star className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <InlineStatus task={task} onUpdate={handleUpdate} />
          <InlineDueDate task={task} onUpdate={handleUpdate} />
          {task.assigneeName ? (
            <span className="text-xs text-[#6B7280]">
              {task.assigneeType === 'agent' ? '🤖 ' : '🧑 '}{task.assigneeName}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  // ── Hierarchy: load rollups for visible tasks on mount ─────────────────
  useEffect(() => {
    // Fetch rollup for each visible parent task to know if they have children
    const fetchRollups = async () => {
      for (const task of filtered) {
        if (parentFlags.has(task.id)) continue
        try {
          const res = await fetch(`/api/tasks/${task.id}/subtasks`)
          if (res.ok) {
            const data = await res.json() as { subtasks: Task[]; rollup: { totalChildren: number; completedChildren: number; blockedChildren: number; inProgressChildren: number; allChildrenResolved: boolean; hasBlockedChild: boolean; hasOverdueChild: boolean; parentSignal: string } }
            if (data.rollup.totalChildren > 0) {
              setParentFlags(prev => { const next = new Map(prev); next.set(task.id, true); return next })
              setRollup(task.id, data.rollup)
            } else {
              setParentFlags(prev => { const next = new Map(prev); next.set(task.id, false); return next })
            }
          }
        } catch { /* ignore */ }
      }
    }
    if (filtered.length > 0 && filtered.length <= 200) {
      void fetchRollups()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length])

  // ── Composite row: TaskRow + optional subtask expansion ─────────────
  function TaskRowWithSubtasks({ task, idx }: { task: Task; idx: number }) {
    return (
      <>
        <TaskRow task={task} idx={idx} />
        <SubtaskExpansion
          parentId={task.id}
          expanded={expandedIds.has(task.id)}
          refreshKey={subtaskRefreshKey}
          onEdit={(t) => { setEditingTask(t); setParentForSubtask(task); setShowDialog(true) }}
          onAddSubtask={() => { setEditingTask(null); setParentForSubtask(task); setShowDialog(true) }}
        />
      </>
    )
  }

  function TaskCardWithSubtasks({ task, idx }: { task: Task; idx: number }) {
    const isExpanded = expandedIds.has(task.id)
    const hasChildren = parentFlags.get(task.id) ?? false
    const childCount = rollups.get(task.id)?.totalChildren
    return (
      <div>
        <TaskCard task={task} idx={idx} />
        <button
          onClick={() => toggleExpand(task.id)}
          className={cn(
            'flex items-center gap-1 text-[10px] mt-1 ml-2 transition-colors',
            hasChildren ? 'text-[#6B7280] hover:text-[#A0A0A0]' : 'text-[#2A2A2A] hover:text-[#4B5563]',
          )}
        >
          <ListTree className="w-3 h-3" />
          {isExpanded ? 'Hide' : hasChildren ? `${childCount ?? '?'} subtasks` : 'Subtasks'}
        </button>
        {isExpanded && (
          <>
            <SubtaskCards
              parentId={task.id}
              expanded={isExpanded}
              onEdit={(t) => { setEditingTask(t); setShowDialog(true) }}
            />
            {/* Mobile add-subtask for empty parents */}
            <button
              onClick={() => { setEditingTask(null); setParentForSubtask(task); setShowDialog(true) }}
              className="flex items-center gap-1.5 text-xs text-[#4B5563] hover:text-[#60A5FA] transition-colors ml-7 mt-1 mb-1"
            >
              <Plus className="w-3 h-3" />
              Add subtask
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Tasks</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowIntake(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#60A5FA] rounded-[6px] hover:bg-[#222222] transition-colors"
          >
            <Inbox className="w-3.5 h-3.5" />
            Intake
          </button>
          <button
            onClick={() => { setEditingTask(null); setParentForSubtask(null); setShowDialog(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New task
          </button>
        </div>
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
          {['active', 'all', ...TASK_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
                statusFilter === s
                  ? 'bg-[#222222] border-[rgba(255,255,255,0.10)] text-[#F5F5F5]'
                  : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
              )}
            >{s === 'all' ? 'All' : s === 'active' ? 'Active' : s}</button>
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
            <Zap className="w-3 h-3" />Urgent
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
            <Star className="w-3 h-3" />Important
          </button>

          {/* Project filter */}
          {projects.length > 0 && (
            <div className="relative">
              <button
                ref={projectFilterRef}
                onClick={() => { setProjectFilterOpen(v => !v); setAreaFilterOpen(false) }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
                  projectFilter
                    ? 'bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.4)] text-[#60A5FA]'
                    : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
                )}
              >
                Project{projectFilter ? `: ${projects.find(p => p.id === projectFilter)?.name ?? '?'}` : ''} <ChevronDown className="w-2.5 h-2.5" />
              </button>
              <PortalDropdown anchorRef={projectFilterRef} isOpen={projectFilterOpen} onClose={() => setProjectFilterOpen(false)} minWidth={180}>
                <button onClick={() => { setProjectFilter(null); setProjectFilterOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2', !projectFilter ? 'text-[#F5F5F5]' : 'text-[#6B7280]')}>
                  {!projectFilter ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />} All projects
                </button>
                {projects.map(p => (
                  <button key={p.id} onClick={() => { setProjectFilter(p.id); setProjectFilterOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2', projectFilter === p.id ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]')}>
                    {projectFilter === p.id ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />} {p.name}
                  </button>
                ))}
              </PortalDropdown>
            </div>
          )}

          {/* Area filter */}
          {areas.length > 0 && (
            <div className="relative">
              <button
                ref={areaFilterRef}
                onClick={() => { setAreaFilterOpen(v => !v); setProjectFilterOpen(false) }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
                  areaFilter
                    ? 'bg-[rgba(139,92,246,0.15)] border-[rgba(139,92,246,0.4)] text-[#A78BFA]'
                    : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
                )}
              >
                Area{areaFilter ? `: ${areas.find(a => a.id === areaFilter)?.name ?? '?'}` : ''} <ChevronDown className="w-2.5 h-2.5" />
              </button>
              <PortalDropdown anchorRef={areaFilterRef} isOpen={areaFilterOpen} onClose={() => setAreaFilterOpen(false)} minWidth={180}>
                <button onClick={() => { setAreaFilter(null); setAreaFilterOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2', !areaFilter ? 'text-[#F5F5F5]' : 'text-[#6B7280]')}>
                  {!areaFilter ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />} All areas
                </button>
                {areas.map(a => (
                  <button key={a.id} onClick={() => { setAreaFilter(a.id); setAreaFilterOpen(false) }} className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.04)] flex items-center gap-2', areaFilter === a.id ? 'text-[#F5F5F5]' : 'text-[#A0A0A0]')}>
                    {areaFilter === a.id ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 shrink-0" />} {a.name}
                  </button>
                ))}
              </PortalDropdown>
            </div>
          )}

          {/* Orphan filter */}
          <button
            onClick={() => setOrphanFilter(f => !f)}
            title="Show tasks with no project or area"
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
              orphanFilter
                ? 'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.4)] text-[#EF4444]'
                : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
            )}
          >
            Unassigned
          </button>

          {/* Grouping toggle */}
          <GroupToggle
            value={grouping}
            onChange={setGrouping}
            options={['project', 'status', 'assignee', 'area']}
          />
        </div>
      </div>

      {/* Batch Toolbar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sticky top-2 z-10">
          <span className="text-xs text-[#A0A0A0] font-medium mr-1">{selectedCount} of {filtered.length} selected</span>

          {/* Change Status */}
          <div className="relative">
            <button
              ref={batchStatusRef}
              onClick={() => { setBatchStatusOpen(v => !v); setBatchAssigneeOpen(false) }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
            >
              Status <ChevronDown className="w-3 h-3" />
            </button>
            <PortalDropdown anchorRef={batchStatusRef} isOpen={batchStatusOpen} onClose={() => setBatchStatusOpen(false)}>
              {TASK_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => { setBatchStatusOpen(false); void batchUpdate({ status: s }) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F5F5] transition-colors"
                >
                  {s}
                </button>
              ))}
            </PortalDropdown>
          </div>

          {/* Change Assignee */}
          {users.length > 0 && (
            <div className="relative">
              <button
                ref={batchAssigneeRef}
                onClick={() => { setBatchAssigneeOpen(v => !v); setBatchStatusOpen(false) }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
              >
                Assignee <ChevronDown className="w-3 h-3" />
              </button>
              <PortalDropdown anchorRef={batchAssigneeRef} isOpen={batchAssigneeOpen} onClose={() => setBatchAssigneeOpen(false)} minWidth={160}>
                <button
                  onClick={() => { setBatchAssigneeOpen(false); void batchUpdate({ assignee: null }) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#6B7280] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                >
                  — Unassigned
                </button>
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setBatchAssigneeOpen(false); void batchUpdate({ assignee: u.name ?? u.email }) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F5F5] transition-colors"
                  >
                    {u.name ?? u.email}
                  </button>
                ))}
              </PortalDropdown>
            </div>
          )}

          <button
            onClick={() => void batchToggle('urgent')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.10)] transition-colors"
          >
            <Zap className="w-3 h-3" /> Urgent
          </button>
          <button
            onClick={() => void batchToggle('important')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#F59E0B] hover:bg-[rgba(245,158,11,0.10)] transition-colors"
          >
            <Star className="w-3 h-3" /> Important
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.10)] transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setLastClickedIdx(null) }}
            className="ml-auto flex items-center gap-1 p-1 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
            title="Deselect all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Desktop table + Mobile cards — with optional grouping */}
      {groups ? (
        <>
          {/* Grouped view */}
          {groups.map(group => (
            <CollapsibleGroup key={group.key} group={group}>
              {/* Desktop */}
              <div className="hidden md:block rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden mb-2">
                <table className="w-full">
                  <tbody>
                    {group.tasks.map((task) => {
                      const globalIdx = filtered.indexOf(task)
                      return (
                        <TaskRowWithSubtasks key={task.id} task={task} idx={globalIdx} />
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-2">
                {group.tasks.map((task) => {
                  const globalIdx = filtered.indexOf(task)
                  return (
                    <TaskCardWithSubtasks key={task.id} task={task} idx={globalIdx} />
                  )
                })}
              </div>
            </CollapsibleGroup>
          ))}
        </>
      ) : (
        <>
          {/* Ungrouped desktop table */}
          <div className="hidden md:block rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="px-3 py-3 w-8">
                    <CustomCheckbox
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Area</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wide w-10">⚡</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wide w-10">⭐</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-[#4B5563]">No tasks found</td></tr>
                ) : filtered.map((task, idx) => (
                  <TaskRowWithSubtasks key={task.id} task={task} idx={idx} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Ungrouped mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[#4B5563] py-12">No tasks found</p>
            ) : filtered.map((task, idx) => (
              <TaskCardWithSubtasks key={task.id} task={task} idx={idx} />
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-6 max-w-sm w-full">
            <h2 className="text-sm font-semibold text-[#F5F5F5] mb-2">Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</h2>
            <p className="text-xs text-[#6B7280] mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">Cancel</button>
              <button onClick={() => void batchDelete()} className="px-4 py-2 text-sm font-medium bg-[#EF4444] text-white rounded-[6px] hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Task dialog */}
      {showDialog && (
        <TaskDialog
          task={editingTask}
          workspaceId={workspaceId}
          parentTask={parentForSubtask}
          onClose={() => { setShowDialog(false); setEditingTask(null); setParentForSubtask(null) }}
          onSave={editingTask ? (d) => handleUpdate(editingTask.id, d) : handleCreate}
          onDelete={editingTask ? () => handleDelete(editingTask.id) : undefined}
          onCreateSubtask={(parent) => {
            // Close current dialog, open fresh dialog in subtask creation mode
            setEditingTask(null)
            setParentForSubtask(parent)
          }}
          areas={areas}
          projects={projects}
          sprints={sprints}
          users={users}
        />
      )}

      {/* Intake dialog */}
      {showIntake && (
        <IntakeDialog
          workspaceId={workspaceId}
          onClose={() => setShowIntake(false)}
          onComplete={() => router.refresh()}
        />
      )}
    </div>
  )
}
