'use client'

import { useState, useEffect } from 'react'
import { Plus, Table2, Trash2, X, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'

interface UserTable {
  id: string
  baseId: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

interface UserBase {
  id: string
  name: string
  description: string | null
  workspace: string
  tables?: UserTable[]
}

const WORKSPACE_COLORS: Record<string, string> = {
  byron_film: '#D4A017',
  korus: '#008080',
  personal: '#F97316',
}

const inputCls =
  'w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563]'
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

function CreateTableDialog({
  baseId,
  onClose,
  onCreated,
}: {
  baseId: string
  onClose: () => void
  onCreated: (table: UserTable) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tables/${baseId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) throw new Error('Failed')
      const table = await res.json()
      onCreated(table)
      toast.success('Table created')
      onClose()
    } catch {
      toast.error('Failed to create table')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F5F5F5]">New Table</h2>
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
              placeholder="e.g. Scene Schedule"
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
              placeholder="Optional"
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
            {saving ? 'Creating…' : 'Create Table'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BaseDetailClient({ baseId }: { baseId: string }) {
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const [base, setBase] = useState<UserBase | null>(null)
  const [tables, setTables] = useState<UserTable[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const wsKey = base?.workspace ?? workspaceId ?? 'personal'
  const accentColor = WORKSPACE_COLORS[wsKey] ?? '#F97316'

  useEffect(() => {
    setLoading(true)
    fetch(`/api/tables/bases/${baseId}`)
      .then((r) => r.json())
      .then((data) => {
        setBase(data)
        const tableList: UserTable[] = data.tables ?? []
        setTables(tableList)
        setLoading(false)
        // Auto-redirect to the editor when there's exactly one table
        if (tableList.length === 1) {
          router.replace(`/bases/${baseId}/${tableList[0].id}`)
        }
      })
      .catch(() => setLoading(false))
  }, [baseId, router])

  async function handleDeleteTable(id: string, name: string) {
    if (!confirm(`Delete table "${name}" and all its data?`)) return
    await fetch(`/api/tables/${baseId}/tables/${id}`, { method: 'DELETE' })
    setTables((prev) => prev.filter((t) => t.id !== id))
    toast.success('Table deleted')
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-[#1A1A1A] rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-[#141414] rounded-[8px] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/bases"
            className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
              {base?.name ?? 'Base'}
            </h1>
            {base?.description && (
              <p className="text-sm text-[#6B7280] mt-0.5">{base.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors"
        >
          <Plus size={14} />
          New Table
        </button>
      </div>

      {/* Accent bar */}
      <div
        className="h-px mb-6"
        style={{ background: `linear-gradient(to right, ${accentColor}40, transparent)` }}
      />

      {/* Table list */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Table2 size={32} className="text-[#4B5563] mb-3" />
          <p className="text-[#6B7280] text-sm">No tables in this base</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors"
          >
            Create first table
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="group flex items-center justify-between bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] px-4 py-3 hover:border-[rgba(255,255,255,0.10)] transition-colors"
            >
              <Link
                href={`/bases/${baseId}/${table.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div
                  className="p-1.5 rounded-[4px]"
                  style={{ background: `${accentColor}18` }}
                >
                  <FileText size={13} style={{ color: accentColor }} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-[#F5F5F5]">{table.name}</span>
                  {table.description && (
                    <p className="text-xs text-[#6B7280] truncate">{table.description}</p>
                  )}
                </div>
              </Link>
              <button
                onClick={() => handleDeleteTable(table.id, table.name)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4B5563] hover:text-[#EF4444] ml-4"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTableDialog
          baseId={baseId}
          onClose={() => setShowCreate(false)}
          onCreated={(t) => setTables((prev) => [...prev, t])}
        />
      )}
    </div>
  )
}
