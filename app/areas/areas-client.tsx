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

const AREA_COLORS = ['#C99A1F', '#3E7A70', '#C96F2E', '#5F7A72', '#7D9B5E', '#C0452E', '#9B6B4F', '#B0584A', '#7A6F55']

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
  const [color, setColor] = useState(area?.color ?? '#7A6F55')
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
      <div className="absolute inset-0 bg-[rgba(10,8,6,0.7)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#201A14] border border-[rgba(167,155,120,0.22)] sm:rounded-none rounded-t-[16px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(167,155,120,0.13)]">
          <h2 className="text-sm font-semibold text-[#E8DFCE]">{area ? 'Edit Area' : 'New Area'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Area name"
            autoFocus
            className="w-full px-3 py-2.5 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)]"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2.5 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] resize-none"
          />

          {/* Context toggle */}
          <div>
            <label className="block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5">Context</label>
            <div className="flex items-center gap-2">
              {['Internal', 'External'].map(ctx => (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContext(context === ctx ? '' : ctx)}
                  className={cn(
                    'flex-1 py-2 text-sm rounded-none border transition-colors',
                    context === ctx
                      ? 'bg-[rgba(167,155,120,0.18)] border-[rgba(167,155,120,0.35)] text-[#E8DFCE]'
                      : 'bg-[#0F0C09] border-[rgba(167,155,120,0.13)] text-[#7A6F55] hover:text-[#A79B78]'
                  )}
                >{ctx}</button>
              ))}
            </div>
          </div>

          {/* Spheres of Responsibility */}
          <div>
            <label className="block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5">Spheres of Responsibility</label>
            {/* Current spheres */}
            {spheres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {spheres.map(sphere => (
                  <span key={sphere} className="inline-flex items-center gap-1 px-2 py-1 rounded-none bg-[rgba(167,155,120,0.13)] border border-[rgba(167,155,120,0.18)] text-xs text-[#E8DFCE]">
                    {sphere}
                    <button type="button" onClick={() => removeSphere(sphere)} className="text-[#7A6F55] hover:text-[#C0452E] transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {/* Text input + add */}
            <div className="flex items-center gap-2">
              <input
                value={sphereInput}
                onChange={e => setSphereInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSphere(sphereInput) } }}
                placeholder="Type a sphere and press Enter..."
                className="flex-1 px-3 py-2 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-xs outline-none focus:border-[rgba(167,155,120,0.35)]"
              />
              <button
                type="button"
                onClick={() => addSphere(sphereInput)}
                className="px-3 py-2 text-xs rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#A79B78] hover:text-[#E8DFCE] hover:border-[rgba(167,155,120,0.35)] transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] appearance-none">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Icon — quick-pick grid + paste input */}
          <div>
            <label className="block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5">Icon</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['👑','💰','⚙️','📈','🎬','🎯','💼','📣','🤖','🏗️','🌏','📁','🔒','🧠','📐','🔬','📊','🗺️','🏠','💪','📚','✈️','🎨','🌿','⚡'].map(e => (
                <button key={e} type="button" onClick={() => setIcon(e)}
                  className={cn('w-8 h-8 text-base flex items-center justify-center rounded-none transition-colors',
                    icon === e ? 'bg-[rgba(167,155,120,0.31)] ring-1 ring-[rgba(167,155,120,0.44)]' : 'hover:bg-[rgba(167,155,120,0.13)]')}>
                  {e}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl w-9 h-9 flex items-center justify-center rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] shrink-0">
                {icon || '📁'}
              </span>
              <input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="Or paste any emoji directly…"
                className="flex-1 px-3 py-2 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)]"
              />
            </div>
            <p className="text-[10px] text-[#5C5340] mt-1">Tap a quick-pick above, or press <kbd className="px-1 py-0.5 rounded-none bg-[rgba(167,155,120,0.13)] text-[#7A6F55] font-mono text-[10px]">⌘ Ctrl Space</kbd> to open the Mac emoji keyboard</p>
          </div>
          <div>
            <label className="block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {AREA_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-6 h-6 rounded-full transition-all', color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#201A14] scale-110' : '')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(167,155,120,0.13)]">
          <div>
            {area && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#C0452E]">
                    Delete? Will unlink {linkedProjectCount} projects, {linkedTaskCount} tasks
                  </span>
                  <button onClick={handleDelete} disabled={deleting}
                    className="p-1 rounded-none text-[#C0452E] hover:bg-[rgba(192,69,46,0.1)] transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="p-1 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#C0452E] transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A79B78] hover:text-[#E8DFCE] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-4 py-2.5 text-sm font-medium bg-[#272018] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[rgba(167,155,120,0.18)] disabled:opacity-40 transition-colors">
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
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Areas</h1>
        <button
          onClick={() => { setEditingArea(null); setShowDialog(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#272018] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New area
        </button>
      </div>

      {areaList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#5C5340]">No areas yet.</p>
          <button
            onClick={() => { setEditingArea(null); setShowDialog(true) }}
            className="mt-3 text-sm text-[#A79B78] hover:text-[#E8DFCE] transition-colors"
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
                className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] hover:border-[rgba(167,155,120,0.22)] hover:bg-[#201A14] transition-all group"
                style={area.color ? { borderLeftColor: area.color, borderLeftWidth: 2 } : undefined}
              >
                {/* Header row: icon + name + context badge + edit */}
                <div className="flex items-start justify-between mb-1">
                  <Link href={`/areas/${area.id}?workspace=${workspaceId}`} className="flex items-center gap-2 flex-1 min-w-0">
                    {area.icon && <span className="text-base shrink-0">{area.icon}</span>}
                    <h3 className="text-sm font-semibold text-[#E8DFCE] truncate">{area.name}</h3>
                    {area.context && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-none font-medium shrink-0',
                        area.context === 'Internal'
                          ? 'text-[#5F7A72] bg-[rgba(95,122,114,0.12)]'
                          : 'text-[#7D9B5E] bg-[rgba(125,155,94,0.12)]'
                      )}>
                        {area.context}
                      </span>
                    )}
                  </Link>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                    <button
                      onClick={() => { setEditingArea(area); setShowDialog(true) }}
                      className="p-1.5 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Description — "Minimise risk in the business" */}
                {area.description && (
                  <p className="text-xs text-[#7A6F55] italic mb-2.5 pl-6">{area.description}</p>
                )}

                {/* Spheres of Responsibility — bullet list */}
                {spheres.length > 0 && (
                  <ul className="pl-6 mb-3 space-y-0.5">
                    {spheres.map(sphere => (
                      <li key={sphere} className="flex items-center gap-1.5 text-xs text-[#A79B78]">
                        <span className="w-1 h-1 rounded-full bg-[#5C5340] shrink-0" />
                        {sphere}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Footer: project/task counts */}
                <div className="flex items-center gap-3 pt-2 border-t border-[rgba(167,155,120,0.09)]">
                  <span className="text-xs text-[#5C5340]">{projCount} projects</span>
                  <span className="text-xs text-[#5C5340]">{taskCount} tasks</span>
                  {area.status === 'archived' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(122,111,85,0.15)] text-[#7A6F55]">Archived</span>
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
