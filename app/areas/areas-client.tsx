'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import Link from 'next/link'
import { type Area, type Project, type Task, type WorkspaceId } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AreasClientProps {
  initialAreas: Area[]
  allProjects: Project[]
  allTasks: Task[]
  workspaceId: WorkspaceId
}

const AREA_ICONS = ['📁', '🎬', '💰', '⚙️', '📈', '🎯', '👥', '📣', '🤖', '🔒', '🌏', '🏗️']
const AREA_COLORS = ['#D4A017', '#008080', '#F97316', '#3B82F6', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

const PRESET_SPHERES = [
  'Insurance', 'Contracts', 'HR', 'Design', 'Content', 'Brand',
  'Operations', 'Finance', 'Marketing', 'Legal',
]

interface AreaDialogProps {
  area?: Area | null
  workspaceId: WorkspaceId
  onClose: () => void
  onSave: (data: Partial<Area>) => Promise<void>
  onDelete?: () => Promise<void>
  linkedProjectCount?: number
  linkedTaskCount?: number
}

function AreaDialog({ area, workspaceId, onClose, onSave, onDelete, linkedProjectCount = 0, linkedTaskCount = 0 }: AreaDialogProps) {
  const [name, setName] = useState(area?.name ?? '')
  const [description, setDescription] = useState(area?.description ?? '')
  const [icon, setIcon] = useState(area?.icon ?? '📁')
  const [color, setColor] = useState(area?.color ?? '#6B7280')
  const [status, setStatus] = useState(area?.status ?? 'active')
  const [context, setContext] = useState(area?.context ?? '')
  const [spheres, setSpheres] = useState<string[]>(area?.spheresOfResponsibility ?? [])
  const [sphereInput, setSphereInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function addSphere(value: string) {
    const trimmed = value.trim()
    if (!trimmed || spheres.includes(trimmed)) return
    setSpheres(prev => [...prev, trimmed])
    setSphereInput('')
  }

  function removeSphere(sphere: string) {
    setSpheres(prev => prev.filter(s => s !== sphere))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description || undefined,
        icon,
        color,
        status,
        workspaceId,
        context: context || undefined,
        spheresOfResponsibility: spheres.length > 0 ? spheres : undefined,
      })
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
      <div className="relative w-full sm:max-w-md bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">{area ? 'Edit Area' : 'New Area'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Area name"
            autoFocus
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] resize-none"
          />

          {/* Context toggle */}
          <div>
            <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Context</label>
            <div className="flex items-center gap-2">
              {['Internal', 'External'].map(ctx => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContext(context === ctx ? '' : ctx)}
                  className={cn(
                    'flex-1 py-2 text-sm rounded-[6px] border transition-colors',
                    context === ctx
                      ? 'bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.16)] text-[#F5F5F5]'
                      : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
                  )}
                >{ctx}</button>
              ))}
            </div>
          </div>

          {/* Spheres of Responsibility */}
          <div>
            <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Spheres of Responsibility</label>
            {/* Current spheres */}
            {spheres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {spheres.map(sphere => (
                  <span key={sphere} className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-xs text-[#F5F5F5]">
                    {sphere}
                    <button type="button" onClick={() => removeSphere(sphere)} className="text-[#6B7280] hover:text-[#EF4444] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Text input + add */}
            <div className="flex items-center gap-2 mb-2">
              <input
                value={sphereInput}
                onChange={e => setSphereInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSphere(sphereInput) } }}
                placeholder="Add sphere..."
                className="flex-1 px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <button
                type="button"
                onClick={() => addSphere(sphereInput)}
                className="px-3 py-2 text-xs rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.16)] transition-colors"
              >
                Add
              </button>
            </div>
            {/* Preset chips */}
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SPHERES.filter(s => !spheres.includes(s)).map(sphere => (
                <button
                  key={sphere}
                  type="button"
                  onClick={() => addSphere(sphere)}
                  className="px-2 py-1 rounded-[4px] text-xs text-[#6B7280] border border-[rgba(255,255,255,0.06)] hover:text-[#A0A0A0] hover:border-[rgba(255,255,255,0.12)] transition-colors"
                >
                  + {sphere}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] appearance-none">
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Icon</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AREA_ICONS.map(i => (
                  <button key={i} type="button" onClick={() => setIcon(i)}
                    className={cn('w-8 h-8 text-base flex items-center justify-center rounded-[4px] transition-colors', icon === i ? 'bg-[rgba(255,255,255,0.12)]' : 'hover:bg-[rgba(255,255,255,0.06)]')}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {AREA_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-6 h-6 rounded-full transition-all', color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1A1A1A] scale-110' : '')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(255,255,255,0.06)]">
          <div>
            {area && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#EF4444]">
                    Delete? Will unlink {linkedProjectCount} projects, {linkedTaskCount} tasks
                  </span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="p-1 rounded text-[#EF4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="p-1 rounded text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-4 py-2.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors">
              {saving ? 'Saving...' : area ? 'Save changes' : 'Create area'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AreasClient({ initialAreas, allProjects, allTasks, workspaceId }: AreasClientProps) {
  const [areaList, setAreaList] = useState(initialAreas)
  const [showDialog, setShowDialog] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)

  function getLinkedProjects(areaId: string) {
    return allProjects.filter(p => p.areaId === areaId).length
  }
  function getLinkedTasks(areaId: string) {
    return allTasks.filter(t => t.areaId === areaId).length
  }

  async function handleCreate(data: Partial<Area>) {
    const res = await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    if (res.ok) {
      const area = await res.json() as Area
      setAreaList(prev => [...prev, area])
      toast.success('Area created')
    } else {
      toast.error('Failed to create area')
    }
  }

  async function handleUpdate(id: string, data: Partial<Area>) {
    const res = await fetch(`/api/areas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json() as Area
      setAreaList(prev => prev.map(a => a.id === id ? updated : a))
      toast.success('Area updated')
    } else {
      toast.error('Failed to update area')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/areas/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAreaList(prev => prev.filter(a => a.id !== id))
      toast.success('Area deleted')
    } else {
      toast.error('Failed to delete area')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Areas</h1>
        <button
          onClick={() => { setEditingArea(null); setShowDialog(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New area
        </button>
      </div>

      {areaList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No areas yet.</p>
          <button
            onClick={() => { setEditingArea(null); setShowDialog(true) }}
            className="mt-3 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            Create your first area →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areaList.map(area => {
            const projCount = getLinkedProjects(area.id)
            const taskCount = getLinkedTasks(area.id)
            const spheres = area.spheresOfResponsibility ?? []
            return (
              <div
                key={area.id}
                className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all group"
                style={area.color ? { borderLeftColor: area.color, borderLeftWidth: 2 } : undefined}
              >
                {/* Header row: icon + name + context badge + edit */}
                <div className="flex items-start justify-between mb-1">
                  <Link href={`/areas/${area.id}?workspace=${workspaceId}`} className="flex items-center gap-2 flex-1 min-w-0">
                    {area.icon && <span className="text-base shrink-0">{area.icon}</span>}
                    <h3 className="text-sm font-semibold text-[#F5F5F5] truncate">{area.name}</h3>
                    {area.context && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                        area.context === 'Internal'
                          ? 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]'
                          : 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]'
                      )}>
                        {area.context}
                      </span>
                    )}
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    <button
                      onClick={() => { setEditingArea(area); setShowDialog(true) }}
                      className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description — "Minimise risk in the business" */}
                {area.description && (
                  <p className="text-xs text-[#6B7280] italic mb-2.5 pl-6">{area.description}</p>
                )}

                {/* Spheres of Responsibility — bullet list */}
                {spheres.length > 0 && (
                  <ul className="pl-6 mb-3 space-y-0.5">
                    {spheres.map(sphere => (
                      <li key={sphere} className="flex items-center gap-1.5 text-xs text-[#A0A0A0]">
                        <span className="w-1 h-1 rounded-full bg-[#4B5563] shrink-0" />
                        {sphere}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Footer: project/task counts */}
                <div className="flex items-center gap-3 pt-2 border-t border-[rgba(255,255,255,0.04)]">
                  <span className="text-xs text-[#4B5563]">{projCount} projects</span>
                  <span className="text-xs text-[#4B5563]">{taskCount} tasks</span>
                  {area.status === 'archived' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(107,114,128,0.15)] text-[#6B7280]">Archived</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDialog && (
        <AreaDialog
          area={editingArea}
          workspaceId={workspaceId}
          onClose={() => { setShowDialog(false); setEditingArea(null) }}
          onSave={editingArea ? (d) => handleUpdate(editingArea.id, d) : handleCreate}
          onDelete={editingArea ? () => handleDelete(editingArea.id) : undefined}
          linkedProjectCount={editingArea ? getLinkedProjects(editingArea.id) : 0}
          linkedTaskCount={editingArea ? getLinkedTasks(editingArea.id) : 0}
        />
      )}
    </div>
  )
}
