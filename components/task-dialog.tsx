'use client'
import { useState } from 'react'
import { X, Trash2, ExternalLink, Zap, Star, Plus } from 'lucide-react'
import { TASK_STATUSES, type WorkspaceId, type Task, type Area, type Project, type Sprint } from '@/types'
import { cn } from '@/lib/utils'

interface TaskDialogProps {
  task?: Task | null
  workspaceId: WorkspaceId
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
  areas?: Area[]
  projects?: Project[]
  sprints?: Sprint[]
}

const IMPACT_OPTIONS = ['low', 'medium', 'high']
const EFFORT_OPTIONS = ['low', 'medium', 'high']

const KORUS_REGIONS = [
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Global', label: '🌏 Global' },
]

export function TaskDialog({ task, workspaceId, onClose, onSave, onDelete, areas = [], projects = [], sprints = [] }: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState(task?.status ?? 'Backlog')
  const [impact, setImpact] = useState(task?.impact ?? '')
  const [effort, setEffort] = useState(task?.effort ?? '')
  const [urgent, setUrgent] = useState(task?.urgent ?? false)
  const [important, setImportant] = useState(task?.important ?? false)
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
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

  function addTag() {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
    }
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
        description: description || undefined,
        status,
        impact: impact || undefined,
        effort: effort || undefined,
        urgent,
        important,
        dueDate: dueDate || undefined,
        assignee: assignee || undefined,
        tags,
        areaId: areaId || undefined,
        projectId: projectId || undefined,
        sprintId: sprintId || undefined,
      }
      if (isKorus) data.region = region || undefined
      await onSave(data)
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(); onClose() } finally { setDeleting(false) }
  }

  const Select = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] appearance-none">
        {children}
      </select>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors resize-none"
          />

          {/* Urgent + Important toggles */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUrgent(u => !u)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-[6px] border text-sm font-medium transition-colors',
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
                'flex items-center gap-2 px-3 py-2 rounded-[6px] border text-sm font-medium transition-colors',
                important
                  ? 'bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.30)] text-[#F59E0B]'
                  : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5]'
              )}
            >
              <Star className="w-3.5 h-3.5" />
              Important
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" value={status} onChange={setStatus}>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label="Impact" value={impact} onChange={setImpact}>
              <option value="">— None —</option>
              {IMPACT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
            <Select label="Effort" value={effort} onChange={setEffort}>
              <option value="">— None —</option>
              {EFFORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </Select>
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Assignee</label>
              <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Name"
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            </div>
          </div>

          {/* Area / Project / Sprint */}
          <div className="grid grid-cols-3 gap-3">
            {areas.length > 0 && (
              <Select label="Area" value={areaId} onChange={setAreaId}>
                <option value="">— None —</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </Select>
            )}
            {projects.length > 0 && (
              <Select label="Project" value={projectId} onChange={setProjectId}>
                <option value="">— None —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
            {sprints.length > 0 && (
              <Select label="Sprint" value={sprintId} onChange={setSprintId}>
                <option value="">— None —</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Tags</label>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-[#6B7280] hover:text-[#EF4444] transition-colors ml-0.5">×</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <button onClick={addTag} className="p-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Region — KORUS only */}
          {isKorus && (
            <Select label="Region" value={region} onChange={setRegion}>
              <option value="">— No region —</option>
              {KORUS_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          )}

          {task?.notionId && (
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Synced from Notion</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <div>
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
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors min-h-[44px]">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim()}
              className="px-4 py-2.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors min-h-[44px]">
              {saving ? 'Saving...' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
