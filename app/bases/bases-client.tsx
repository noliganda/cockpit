'use client'

import { useState, useEffect } from 'react'
import { Plus, Database, Table2, Trash2, X, Share2, Check } from 'lucide-react'
import Link from 'next/link'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'
import { type UserBase } from '@/types'

const WORKSPACE_COLORS: Record<string, string> = {
  byron_film: '#D4A017',
  korus: '#008080',
  personal: '#F97316',
}

const WORKSPACE_LABELS: Record<string, string> = {
  byron_film: 'Byron Film',
  korus: 'KORUS',
  personal: 'Personal',
}

const inputCls =
  'w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563]'
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

function CreateBaseDialog({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string
  onClose: () => void
  onCreated: (base: UserBase) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tables/bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, workspace: workspaceId }),
      })
      if (!res.ok) throw new Error('Failed to create base')
      const base = await res.json()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F5F5F5]">New Base</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
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
              placeholder="e.g. Cast Tracker"
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
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors disabled:opacity-40"
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
  const [bases, setBases] = useState<UserBase[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const wsKey = workspaceId ?? 'personal'
  const accentColor = WORKSPACE_COLORS[wsKey] ?? '#F97316'

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
    // If already has a share token + isPublic, copy the URL
    if (base.shareToken && base.isPublic) {
      const url = `${window.location.origin}/bases/share/${base.shareToken}`
      await navigator.clipboard.writeText(url)
      setCopiedId(base.id)
      toast.success('Share link copied!')
      setTimeout(() => setCopiedId(null), 2000)
      return
    }
    // Otherwise generate token + enable sharing
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Bases</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Spreadsheets &amp; databases</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors"
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
              className="h-32 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] animate-pulse"
            />
          ))}
        </div>
      ) : bases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Database size={32} className="text-[#4B5563] mb-3" />
          <p className="text-[#6B7280] text-sm">No bases yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors"
          >
            Create your first base
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bases.map((base) => (
            <div
              key={base.id}
              className="group relative bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] overflow-hidden hover:border-[rgba(255,255,255,0.10)] transition-colors"
            >
              {/* Accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ background: accentColor }}
              />
              <Link href={`/bases/${base.id}`} className="block p-5 pt-6">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-[6px] mt-0.5 flex-shrink-0"
                    style={{ background: `${accentColor}18` }}
                  >
                    <Table2 size={16} style={{ color: accentColor }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-[#F5F5F5] truncate">{base.name}</h3>
                      {base.isPublic && (
                        <span className="text-xs px-1.5 py-0 rounded-full bg-[rgba(34,197,94,0.12)] text-[#22C55E] shrink-0">Shared</span>
                      )}
                    </div>
                    {base.description && (
                      <p className="text-xs text-[#6B7280] mt-0.5 truncate">{base.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className="text-xs text-[#4B5563]">
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
                  className="w-6 h-6 flex items-center justify-center rounded text-[#4B5563] hover:text-[#2A9D8F] transition-colors"
                  title={base.isPublic ? 'Copy share link' : 'Enable sharing'}
                >
                  {copiedId === base.id ? <Check size={12} className="text-[#22C55E]" /> : <Share2 size={12} />}
                </button>
                <button
                  onClick={() => handleDelete(base.id, base.name)}
                  className="w-6 h-6 flex items-center justify-center rounded text-[#4B5563] hover:text-[#EF4444] transition-colors"
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
          onCreated={(base) => setBases((prev) => [...prev, base])}
        />
      )}
    </div>
  )
}
