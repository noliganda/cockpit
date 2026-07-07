'use client'

import { useState, useEffect } from 'react'
import { Plus, Database, Table2, Trash2, X, Share2, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'
import { type UserBase } from '@/types'

const WORKSPACE_COLORS: Record<string, string> = {
  byron_film: '#C99A1F',
  korus: '#3E7A70',
  personal: '#C96F2E',
}

const WORKSPACE_LABELS: Record<string, string> = {
  byron_film: 'Byron Film',
  korus: 'KORUS',
  personal: 'Personal',
}

const inputCls =
  'w-full px-3 py-2 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] placeholder:text-[#5C5340]'
const labelCls = 'block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5'
const selectCls =
  'w-full px-3 py-2 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] appearance-none'

interface AreaOption { id: string; name: string }
interface ProjectOption { id: string; name: string }

function CreateBaseDialog({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: (base: UserBase & { defaultTableId?: string }) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [areaId, setAreaId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [areas, setAreas] = useState<AreaOption[]>([])
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/areas?workspace=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setAreas(Array.isArray(d) ? d : []))
      .catch(() => {})
    fetch(`/api/projects?workspace=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setProjectOptions(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [workspaceId])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tables/bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          workspace: workspaceId,
          areaId: areaId || null,
          projectId: projectId || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create base')
      const base = await res.json() as UserBase & { defaultTableId?: string }
      onCreated(base)
      toast.success('Base created')
      onClose()
    } catch {
      toast.error('Failed to create base')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,8,6,0.7)] backdrop-blur-sm">
      <div className="bg-[#1A1510] border border-[rgba(167,155,120,0.13)] rounded-none w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#E8DFCE]">New Base</h2>
          <button onClick={onClose} className="text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shoot Breakdown"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Link to Area or Project (mutually exclusive) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Link to Area</label>
              <select
                className={selectCls}
                value={areaId}
                onChange={(e) => { setAreaId(e.target.value); if (e.target.value) setProjectId('') }}
              >
                <option value="">— none —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Link to Project</label>
              <select
                className={selectCls}
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); if (e.target.value) setAreaId('') }}
              >
                <option value="">— none —</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {(areaId || projectId) && (
            <p className="text-xs text-[#7A6F55] -mt-1">
              This base will appear in the{' '}
              {areaId
                ? `"${areas.find((a) => a.id === areaId)?.name ?? ''}" area`
                : `"${projectOptions.find((p) => p.id === projectId)?.name ?? ''}" project`}{' '}
              Bases tab.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-none text-sm text-[#A79B78] hover:text-[#E8DFCE] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-none text-sm bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] hover:bg-[#272018] transition-colors disabled:opacity-40"
          >
            {saving ? 'Creating…' : 'Create Base'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BasesClient() {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const [bases, setBases] = useState<UserBase[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const wsKey = workspaceId ?? 'personal'
  const accentColor = WORKSPACE_COLORS[wsKey] ?? '#C96F2E'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/tables/bases?workspace=${wsKey}`)
      .then((r) => r.json())
      .then((data) => {
        setBases(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [wsKey])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will delete all tables and data inside.`)) return
    await fetch(`/api/tables/bases/${id}`, { method: 'DELETE' })
    setBases((prev) => prev.filter((b) => b.id !== id))
    toast.success('Base deleted')
  }

  async function handleShare(base: UserBase) {
    if (base.shareToken && base.isPublic) {
      const url = `${window.location.origin}/bases/share/${base.shareToken}`
      await navigator.clipboard.writeText(url)
      setCopiedId(base.id)
      toast.success('Share link copied!')
      setTimeout(() => setCopiedId(null), 2000)
      return
    }
    const res = await fetch(`/api/tables/bases/${base.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: true, generateShareToken: true }),
    })
    if (res.ok) {
      const updated = await res.json() as UserBase
      setBases((prev) => prev.map((b) => b.id === base.id ? updated : b))
      const url = `${window.location.origin}/bases/share/${updated.shareToken}`
      await navigator.clipboard.writeText(url)
      setCopiedId(base.id)
      toast.success('Sharing enabled — link copied!')
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  function handleCreated(base: UserBase & { defaultTableId?: string }) {
    setBases((prev) => [...prev, base])
    // Go straight to the table editor if a default table was auto-created
    if (base.defaultTableId) {
      router.push(`/bases/${base.id}/${base.defaultTableId}`)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Bases</h1>
          <p className="text-sm text-[#7A6F55] mt-0.5">Spreadsheets &amp; databases</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-none text-sm bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] hover:bg-[#272018] transition-colors"
        >
          <Plus size={14} />
          New Base
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] animate-pulse"
            />
          ))}
        </div>
      ) : bases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Database size={32} className="text-[#5C5340] mb-3" />
          <p className="text-[#7A6F55] text-sm">No bases yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-none text-sm bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] hover:bg-[#272018] transition-colors"
          >
            Create your first base
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bases.map((base) => (
            <div
              key={base.id}
              className="group relative bg-[#1A1510] border border-[rgba(167,155,120,0.13)] rounded-none overflow-hidden hover:border-[rgba(167,155,120,0.22)] transition-colors"
            >
              {/* Accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: accentColor }}
              />
              <Link href={`/bases/${base.id}`} className="block p-5 pt-6">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-none mt-0.5 flex-shrink-0"
                    style={{ background: `${accentColor}18` }}
                  >
                    <Table2 size={16} style={{ color: accentColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#E8DFCE] truncate">{base.name}</h3>
                      {base.isPublic && (
                        <span className="text-xs px-1.5 py-0 rounded-full bg-[rgba(125,155,94,0.12)] text-[#7D9B5E] shrink-0">Shared</span>
                      )}
                    </div>
                    {base.description && (
                      <p className="text-xs text-[#7A6F55] mt-0.5 truncate">{base.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-xs text-[#5C5340]">
                        {WORKSPACE_LABELS[base.workspace] ?? base.workspace}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); void handleShare(base) }}
                  className="w-6 h-6 flex items-center justify-center rounded-none text-[#5C5340] hover:text-[#3E7A70] transition-colors"
                  title={base.isPublic ? 'Copy share link' : 'Enable sharing'}
                >
                  {copiedId === base.id ? <Check size={12} className="text-[#7D9B5E]" /> : <Share2 size={12} />}
                </button>
                <button
                  onClick={() => handleDelete(base.id, base.name)}
                  className="w-6 h-6 flex items-center justify-center rounded-none text-[#5C5340] hover:text-[#C0452E] transition-colors"
                  title="Delete base"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBaseDialog
          workspaceId={wsKey}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
