'use client'
import { useState } from 'react'
import { X, Trash2, ExternalLink } from 'lucide-react'
import { WORKSPACE_STATUSES, type WorkspaceId, type Task } from '@/types'

interface TaskDialogProps {
  task?: Task | null
  workspaceId: WorkspaceId
  onClose: () => void
  onSave: (data: Partial<Task>) => Promise<void>
  onDelete?: () => Promise<void>
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const KORUS_REGIONS = [
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Global', label: '🌏 Global' },
]

export function TaskDialog({ task, workspaceId, onClose, onSave, onDelete }: TaskDialogProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState(task?.status ?? WORKSPACE_STATUSES[workspaceId][0])
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [region, setRegion] = useState(task?.region ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const statuses = WORKSPACE_STATUSES[workspaceId] ?? ['Backlog']
  const isKorus = workspaceId === 'korus'

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const data: Partial<Task> = {
        title: title.trim(),
        description: description || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        assignee: assignee || undefined,
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
          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] appearance-none">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Priority */}
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] appearance-none">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {/* Due date */}
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] [color-scheme:dark]" />
            </div>
            {/* Assignee */}
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Assignee</label>
              <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Name"
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            </div>
          </div>

          {/* Region — KORUS only */}
          {isKorus && (
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Region</label>
              <select value={region} onChange={e => setRegion(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] appearance-none">
                <option value="">— No region —</option>
                {KORUS_REGIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
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
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors min-h-[44px] px-2">
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
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
