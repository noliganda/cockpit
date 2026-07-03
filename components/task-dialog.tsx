'use client'
import { useState, useEffect } from 'react'
import { X, Trash2, ExternalLink, Zap, Star, Plus, ListTree, ArrowUpRight, Copy, Check, History, AlertTriangle, CheckCircle2, Circle } from 'lucide-react'
import { TASK_STATUSES, type WorkspaceId, type Task, type Area, type Project, type Sprint } from '@/types'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(() => import('./block-editor').then(m => m.BlockEditor), { ssr: false })

// ── Task timeline ────────────────────────────────────────────────────────────
// Read-only render of the structured task_events feed (GET /api/tasks/[id]/events).
// Surfaces the harness progress/artifact/verification events appended via the
// events endpoint, plus the lifecycle events written on every task mutation.

interface TaskEvent {
  id: string
  eventType: string
  fromStatus: string | null
  toStatus: string | null
  actorType: string | null
  actorName: string | null
  summaryNote: string | null
  blockedReason: string | null
  artifactUrl: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function humanizeEventType(type: string): string {
  return type
    .replace(/^task_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

// Per-event-family accent (icon + color). Falls back to a neutral dot.
function eventVisual(ev: TaskEvent): { Icon: typeof Circle; color: string } {
  const t = ev.eventType
  if (ev.blockedReason || t.includes('blocked') || t.includes('at_risk') || t.includes('failed'))
    return { Icon: AlertTriangle, color: '#EF4444' }
  if (t.includes('completed') || t.includes('done') || t.includes('verification') || t.includes('unblocked') || t.includes('ready_for_review'))
    return { Icon: CheckCircle2, color: '#34D399' }
  if (ev.artifactUrl || t.includes('artifact'))
    return { Icon: ExternalLink, color: '#60A5FA' }
  if (t.includes('created') || t.includes('assigned') || t.includes('started') || t.includes('submitted'))
    return { Icon: Circle, color: '#60A5FA' }
  return { Icon: Circle, color: '#6B7280' }
}

function TaskTimeline({ taskId }: { taskId: string }) {
  const [events, setEvents] = useState<TaskEvent[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/tasks/${taskId}/events`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((data: unknown) => { if (active) setEvents(Array.isArray(data) ? (data as TaskEvent[]) : []) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [taskId])

  if (error) return null
  if (events && events.length === 0) return null

  return (
    <div className="p-3.5 rounded-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
        <History className="w-3.5 h-3.5 text-[#60A5FA]" />
        <span>Timeline</span>
        {events && <span className="text-[#6B7280] normal-case font-normal tracking-normal">· {events.length}</span>}
      </div>

      {!events ? (
        <p className="text-xs text-[#6B7280]">Loading…</p>
      ) : (
        <ol className="relative space-y-3">
          {events.map((ev, i) => {
            const { Icon, color } = eventVisual(ev)
            const model = ev.metadata?.executingModel as string | undefined
            const session = ev.metadata?.executingSessionId as string | undefined
            const isLast = i === events.length - 1
            return (
              <li key={ev.id} className="relative flex gap-2.5">
                {/* Rail */}
                <div className="flex flex-col items-center shrink-0">
                  <Icon className="w-3.5 h-3.5 mt-0.5" style={{ color }} />
                  {!isLast && <span className="w-px flex-1 mt-1 bg-[rgba(255,255,255,0.08)]" />}
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-[#F5F5F5]">{humanizeEventType(ev.eventType)}</span>
                    <span className="text-[10px] text-[#6B7280] shrink-0" title={new Date(ev.createdAt).toLocaleString()}>
                      {formatRelativeTime(ev.createdAt)}
                    </span>
                  </div>
                  {ev.fromStatus && ev.toStatus && (
                    <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">{ev.fromStatus} → {ev.toStatus}</p>
                  )}
                  {ev.summaryNote && <p className="text-xs text-[#A0A0A0] mt-0.5 break-words">{ev.summaryNote}</p>}
                  {ev.blockedReason && (
                    <p className="text-xs text-[#EF4444] mt-0.5 break-words">Blocked: {ev.blockedReason}</p>
                  )}
                  {ev.artifactUrl && (
                    <a href={ev.artifactUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#60A5FA] hover:underline mt-0.5 break-all">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ev.artifactUrl}</span>
                    </a>
                  )}
                  {(ev.actorName || model || session) && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1 text-[10px] text-[#6B7280] font-mono">
                      {ev.actorName && <span>{ev.actorName}</span>}
                      {model && <span className="px-1.5 py-0.5 rounded-[3px] bg-[rgba(255,255,255,0.04)]">🤖 {model}</span>}
                      {session && <span className="px-1.5 py-0.5 rounded-[3px] bg-[rgba(255,255,255,0.04)] truncate max-w-[140px]">{session}</span>}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface TaskDialogProps {
  task?: Task | null
  workspaceId: WorkspaceId
  defaultStatus?: string
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
  onCreateSubtask?: (parentTask: Task) => void
  /** When set, this dialog is creating a subtask under this parent */
  parentTask?: Task | null
  areas?: Area[]
  projects?: Project[]
  sprints?: Sprint[]
  users?: UserOption[]
}

const IMPACT_OPTIONS = ['low', 'medium', 'high']
const EFFORT_OPTIONS = ['low', 'medium', 'high']

const KORUS_REGIONS = [
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Global', label: '🌏 Global' },
]

const VIRTUAL_HARNESSES = [
  { id: 'hermes', name: 'Hermes', operatorType: 'function' },
  { id: 'claude-code', name: 'Claude Code', operatorType: 'function' },
  { id: 'codex', name: 'Codex', operatorType: 'function' },
  { id: 'opencode', name: 'OpenCode', operatorType: 'function' },
  { id: 'openclaw', name: 'OpenClaw', operatorType: 'function' },
  { id: 'nanoclaw', name: 'NanoClaw', operatorType: 'function' },
  { id: 'pie', name: 'Pie', operatorType: 'function' },
]

const inputCls = 'w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors'
const selectCls = `${inputCls} appearance-none`
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

export function TaskDialog({ task, workspaceId, defaultStatus, onClose, onSave, onDelete, onCreateSubtask, parentTask, areas = [], projects = [], sprints = [] }: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState<unknown>(task?.description ?? undefined)
  const [status, setStatus] = useState(task?.status ?? defaultStatus ?? 'Backlog')
  const [impact, setImpact] = useState(task?.impact ?? '')
  const [effort, setEffort] = useState(task?.effort ?? '')
  const [urgent, setUrgent] = useState(task?.urgent ?? false)
  const [important, setImportant] = useState(task?.important ?? false)
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [assigneeId, setAssigneeId] = useState<string>(task?.assigneeId ?? '')
  const [assigneeName, setAssigneeName] = useState<string>(task?.assigneeName ?? '')
  const [assigneeType, setAssigneeType] = useState<string>(task?.assigneeType ?? '')
  const [executingModel, setExecutingModel] = useState(task?.executingModel ?? '')
  const [executingSessionId, setExecutingSessionId] = useState(task?.executingSessionId ?? '')
  const [customHarness, setCustomHarness] = useState(task?.assigneeType === 'function' && task?.assigneeName && !VIRTUAL_HARNESSES.some(h => h.id === task.assigneeId) ? task.assigneeName : '')
  const [copied, setCopied] = useState(false)

  const handleCopySessionId = (sessionId: string) => {
    navigator.clipboard.writeText(`hermes --resume ${sessionId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const [operatorsList, setOperatorsList] = useState<{ id: string; name: string; operatorType: string; status?: string }[]>([])
  const [operatorsLoaded, setOperatorsLoaded] = useState(false)
  useEffect(() => {
    fetch('/api/operators')
      .then(res => res.json())
      .then((data: unknown) => setOperatorsList(Array.isArray(data) ? (data as { id: string; name: string; operatorType: string; status?: string }[]).filter(o => o.id !== 'charlie') : []))
      .catch(() => setOperatorsList([]))
      .finally(() => setOperatorsLoaded(true))
  }, [])
  const [region, setRegion] = useState(task?.region ?? '')
  const [areaId, setAreaId] = useState(task?.areaId ?? '')
  const [projectId, setProjectId] = useState(task?.projectId ?? '')
  const [sprintId, setSprintId] = useState(task?.sprintId ?? '')
  const [tags, setTags] = useState<string[]>(task?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isKorus = workspaceId === 'korus'

  // ── Hierarchy context ───────────────────────────────────────────────────
  const isSubtask = !!(task?.parentTaskId) || !!parentTask
  const isCreatingSubtask = !task && !!parentTask
  const isEditingParent = !!task && !task.parentTaskId && !parentTask
  // The parent we're creating under, or the parent of the task we're editing
  const effectiveParent = parentTask ?? null

  // Project → Area mutual exclusion logic
  const selectedProject = projects.find(p => p.id === projectId) ?? null
  const projectAreaId = selectedProject?.areaId ?? null
  const effectiveAreaId = projectAreaId ?? areaId

  function handleProjectChange(id: string) {
    setProjectId(id)
    if (id) setAreaId('') // clear area when project selected
  }

  function handleAreaChange(id: string) {
    setAreaId(id)
    if (id) setProjectId('') // clear project when area selected
  }

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(prev => prev.filter(t => t !== tag))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const data: Partial<Task> = {
        title: title.trim(),
        description: description
          ? (typeof description === 'string' ? description : JSON.stringify(description))
          : undefined,
        status,
        impact: impact || undefined,
        effort: effort || undefined,
        urgent,
        important,
        dueDate: dueDate || undefined,
        assignee: assignee || undefined,
        assigneeId: assigneeId || undefined,
        assigneeName: assigneeName || undefined,
        // Registry wins at save time: whatever race put a stale type in state,
        // an id that names a registered operator carries that operator's type.
        assigneeType: (operatorsList.find(o => o.id === assigneeId)?.operatorType ?? assigneeType) || undefined,
        executingModel: executingModel || undefined,
        executingSessionId: executingSessionId || undefined,
        tags,
        areaId: effectiveAreaId || undefined,
        projectId: projectId || undefined,
        sprintId: sprintId || undefined,
      }
      if (isKorus) data.region = region || undefined
      // Attach parent when creating a subtask
      if (isCreatingSubtask && parentTask) {
        data.parentTaskId = parentTask.id
      }
      await onSave(data)
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(); onClose() } finally { setDeleting(false) }
  }

  // ── Derive dialog title ─────────────────────────────────────────────────
  let dialogTitle = task ? 'Edit Task' : 'New Task'
  if (isCreatingSubtask) dialogTitle = 'New Subtask'
  else if (isSubtask && task) dialogTitle = 'Edit Subtask'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <div className="flex items-center gap-2">
            {isSubtask && <ListTree className="w-3.5 h-3.5 text-[#6B7280]" />}
            <h2 className="text-sm font-semibold text-[#F5F5F5]">{dialogTitle}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Parent context banner */}
          {(isCreatingSubtask || (isSubtask && task)) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)]">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-[#60A5FA]">Parent task</span>
                <p className="text-xs text-[#A0A0A0] truncate">
                  {effectiveParent?.title ?? 'Parent task'}
                </p>
              </div>
            </div>
          )}

          {/* Row 1: Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isSubtask ? 'Subtask title *' : 'Task title *'}
            autoFocus
            className={cn(inputCls, !title.trim() && title !== '' && 'border-[rgba(239,68,68,0.5)]')}
          />

          {/* Row 2: Status | Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className={cn(inputCls, '[color-scheme:dark]')} />
            </div>
          </div>

          {/* Row 3: Assignee | Tags */}
          <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Assignee</label>
            <div className="relative">
              <select
                value={assigneeId}
                onChange={e => {
                  const id = e.target.value
                  const op = operatorsList.find(o => o.id === id) ?? VIRTUAL_HARNESSES.find(h => h.id === id)
                  if (op) {
                    setCustomHarness('')
                    setAssigneeName(op.name)
                    setAssigneeId(op.id)
                    setAssignee(op.name)
                    setAssigneeType(op.operatorType)
                  } else {
                    setCustomHarness('')
                    setAssigneeName('')
                    setAssigneeId('')
                    setAssignee('')
                    setAssigneeType('')
                  }
                }}
                className={selectCls}
              >
                <option value="">— Unassigned —</option>
                <optgroup label="Humans" className="text-gray-400 bg-[#1A1A1A]">
                  {operatorsList.filter(op => op.operatorType === 'human' && op.status !== 'retired').map(op => (
                    <option key={op.id} value={op.id} className="text-[#F5F5F5]">
                      🧑 {op.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Autonomous Agents" className="text-gray-400 bg-[#1A1A1A]">
                  {operatorsList.filter(op => op.operatorType === 'agent' && op.status !== 'retired').map(op => (
                    <option key={op.id} value={op.id} className="text-[#F5F5F5]">
                      🤖 {op.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Harnesses / Functions" className="text-gray-400 bg-[#1A1A1A]">
                  {/* Hide virtual entries shadowed by a REAL registered operator —
                      duplicate ids (hermes, claude-code) would list twice and the
                      function-typed duplicate loses to the registry on select.
                      Rendered only once the registry has LOADED: before that, the
                      filter can't see the shadowing and a fast selection of the
                      virtual hermes would mistype the assignee as 'function'. */}
                  {operatorsLoaded && VIRTUAL_HARNESSES.filter(h => !operatorsList.some(o => o.id === h.id)).map(op => (
                    <option key={op.id} value={op.id} className="text-[#F5F5F5]">
                      ⚡️ {op.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input
                value={customHarness}
                onChange={e => {
                  const value = e.target.value
                  setCustomHarness(value)
                  if (value.trim()) {
                    const id = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                    setAssigneeName(value.trim())
                    setAssigneeId(id)
                    setAssignee(value.trim())
                    setAssigneeType('function')
                  }
                }}
                placeholder="Or type custom harness: OpenClaw, NanoClaw, Pie…"
                className={cn(inputCls, 'mt-2')}
              />
              {assigneeType === 'function' && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#60A5FA]">
                  <span>⚡️ Ephemeral Function Harness</span>
                </div>
              )}
              {assigneeType === 'agent' && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#A78BFA]">
                  <span>🤖 Autonomous Agent Operator</span>
                </div>
              )}
              {assigneeType === 'human' && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#34D399]">
                  <span>🧑 Human Operator</span>
                </div>
              )}
            </div>
          </div>
            <div>
              <label className={labelCls}>Tags</label>
              <div className="flex items-center gap-1.5">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Add tag..."
                  className={cn(inputCls, 'flex-1')}
                />
                <button onClick={addTag} className="p-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-[#6B7280] hover:text-[#EF4444] transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Execution identity — required for harness/API work tracking */}
          {(assigneeType === 'function' || assigneeType === 'agent' || executingModel || executingSessionId) && (
            <div className="p-3.5 rounded-[8px] bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.12)] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>Execution identity</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Executing Model</label>
                  <input
                    value={executingModel}
                    onChange={e => setExecutingModel(e.target.value)}
                    placeholder="opus-4.7, gpt-5.5, kimi-k2.6…"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Session ID</label>
                  <input
                    value={executingSessionId}
                    onChange={e => setExecutingSessionId(e.target.value)}
                    placeholder="Resume/session/run ID"
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#6B7280]">
                These fields are written to task metadata and operational logs so work can be traced back to the exact harness, model, and resumable session.
              </p>
            </div>
          )}

          {/* Row 4: Project | Area — hidden for subtasks (inherited from parent) */}
          {!isSubtask && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Project</label>
                <select value={projectId} onChange={e => handleProjectChange(e.target.value)} className={selectCls}>
                  <option value="">— No project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Area {projectAreaId ? '(from project)' : ''}</label>
                {projectAreaId ? (
                  <div className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.04)] text-[#6B7280] text-sm">
                    {(() => { const a = areas.find(ar => ar.id === projectAreaId); return a ? `${a.icon ?? ''} ${a.name}` : '—' })()}
                  </div>
                ) : (
                  <select
                    value={areaId}
                    onChange={e => handleAreaChange(e.target.value)}
                    disabled={!!projectId}
                    className={cn(selectCls, projectId && 'opacity-50 cursor-not-allowed')}
                  >
                    <option value="">— No area —</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Row 5: Urgent/Important | Impact/Effort — only for parent tasks */}
          {!isSubtask && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setUrgent(u => !u)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-[6px] border text-sm font-medium transition-colors',
                  urgent
                    ? 'bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.30)] text-[#EF4444]'
                    : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5]'
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Urgent
              </button>
              <button
                onClick={() => setImportant(i => !i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-[6px] border text-sm font-medium transition-colors',
                  important
                    ? 'bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.30)] text-[#F59E0B]'
                    : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5]'
                )}
              >
                <Star className="w-3.5 h-3.5" />
                Important
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <div>
                  <select value={impact} onChange={e => setImpact(e.target.value)}
                    className="px-2.5 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-xs outline-none appearance-none focus:border-[rgba(255,255,255,0.16)]">
                    <option value="">Impact</option>
                    {IMPACT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <select value={effort} onChange={e => setEffort(e.target.value)}
                    className="px-2.5 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-xs outline-none appearance-none focus:border-[rgba(255,255,255,0.16)]">
                    <option value="">Effort</option>
                    {EFFORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Subtask effort (lighter version for execution tasks) */}
          {isSubtask && (
            <div>
              <label className={labelCls}>Effort</label>
              <select value={effort} onChange={e => setEffort(e.target.value)} className={selectCls}>
                <option value="">— No estimate —</option>
                {EFFORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}

          {/* Row 5b: Sprint (optional) — parent tasks only */}
          {!isSubtask && sprints.length > 0 && (
            <div>
              <label className={labelCls}>Sprint</label>
              <select value={sprintId} onChange={e => setSprintId(e.target.value)} className={selectCls}>
                <option value="">— No sprint —</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Row 6: Region — KORUS only, parent tasks only */}
          {isKorus && !isSubtask && (
            <div>
              <label className={labelCls}>Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)} className={selectCls}>
                <option value="">— No region —</option>
                {KORUS_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}

          {/* Row 7: Description */}
          <div>
            <label className={labelCls}>Description</label>
            <div className="rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] overflow-hidden max-h-48 overflow-y-auto">
              <BlockEditor
                initialContent={task?.description}
                onChange={(blocks) => setDescription(blocks)}
                className="text-sm [&_.bn-editor]:min-h-[80px] [&_.bn-editor]:px-3 [&_.bn-editor]:py-2"
              />
            </div>
          </div>

          {/* Execution Footprint Panel */}
          {(task?.executingModel || task?.executingSessionId) && (
            <div className="p-3.5 rounded-[8px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[#60A5FA]" />
                <span>Execution Footprint</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {task?.executingModel && (
                  <div>
                    <span className="text-[#6B7280] block mb-1">Executing Model</span>
                    <div className="font-mono text-[#F5F5F5] bg-[#0A0A0A] px-2.5 py-1.5 rounded-[4px] border border-[rgba(255,255,255,0.04)] truncate flex items-center gap-1.5">
                      <span>🤖</span>
                      <span className="truncate">{task.executingModel}</span>
                    </div>
                  </div>
                )}
                {task?.executingSessionId && (
                  <div>
                    <span className="text-[#6B7280] block mb-1">Session ID</span>
                    <div className="font-mono text-[#F5F5F5] bg-[#0A0A0A] px-2.5 py-1.5 rounded-[4px] border border-[rgba(255,255,255,0.04)] flex items-center justify-between gap-1.5 min-w-0">
                      <span className="truncate">{task.executingSessionId}</span>
                      <button
                        onClick={() => handleCopySessionId(task.executingSessionId!)}
                        className="p-1 rounded-[4px] hover:bg-[rgba(255,255,255,0.08)] text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0"
                        title="Copy resume command"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-[#34D399]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline — structured event history for existing tasks */}
          {task?.id && <TaskTimeline taskId={task.id} />}

          {task?.notionId && (
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Synced from Notion</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <div className="flex items-center gap-2">
            {task && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#EF4444]">Delete this task?</span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-xs text-[#EF4444] hover:underline font-medium">
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#6B7280] hover:text-[#F5F5F5]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors min-h-[44px] px-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )
            )}
            {/* Add subtask button — shown when editing a parent task */}
            {isEditingParent && task && onCreateSubtask && (
              <button
                onClick={() => onCreateSubtask(task)}
                className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#60A5FA] transition-colors min-h-[44px] px-2"
              >
                <ListTree className="w-3.5 h-3.5" />
                Add subtask
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors min-h-[44px]">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim()}
              className="px-4 py-2.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors min-h-[44px]">
              {saving ? 'Saving...' : isCreatingSubtask ? 'Create subtask' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
