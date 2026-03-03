'use client'
import { useState } from 'react'
import { Plus, Database, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { type WorkspaceId, type Base, type BaseColumn } from '@/types'
import { toast } from 'sonner'

interface BaseWithCount extends Omit<Base, 'schema'> {
  schema: BaseColumn[]
  rowCount: number
}

interface BasesClientProps {
  initialBases: BaseWithCount[]
  workspaceId: WorkspaceId
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
] as const

export function BasesClient({ initialBases, workspaceId }: BasesClientProps) {
  const [baseList, setBaseList] = useState(initialBases)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColumns, setNewColumns] = useState<BaseColumn[]>([
    { name: 'Name', type: 'text' },
  ])
  const [creating, setCreating] = useState(false)

  function addColumn() {
    setNewColumns(prev => [...prev, { name: '', type: 'text' }])
  }

  function updateColumn(i: number, field: keyof BaseColumn, value: string) {
    setNewColumns(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function removeColumn(i: number) {
    setNewColumns(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const validCols = newColumns.filter(c => c.name.trim())
      const res = await fetch('/api/bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription || undefined,
          workspaceId,
          schema: validCols,
        }),
      })
      if (res.ok) {
        const base = await res.json() as BaseWithCount
        setBaseList(prev => [{ ...base, rowCount: 0 }, ...prev])
        setNewName(''); setNewDescription(''); setNewColumns([{ name: 'Name', type: 'text' }])
        setShowCreate(false)
        toast.success('Base created')
      } else {
        toast.error('Failed to create base')
      }
    } catch { toast.error('Error creating base') }
    finally { setCreating(false) }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete base "${name}"? This will delete all rows.`)) return
    const res = await fetch(`/api/bases/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBaseList(prev => prev.filter(b => b.id !== id))
      toast.success('Base deleted')
    } else {
      toast.error('Failed to delete base')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Bases</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New base
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Create Base</h2>
            <button onClick={() => setShowCreate(false)} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 mb-4">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Base name" autoFocus
              className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            <input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
          </div>

          <div className="mb-4">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Columns</p>
            <div className="space-y-2">
              {newColumns.map((col, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={col.name} onChange={e => updateColumn(i, 'name', e.target.value)} placeholder="Column name"
                    className="flex-1 px-2.5 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
                  <select value={col.type} onChange={e => updateColumn(i, 'type', e.target.value)}
                    className="px-2.5 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none">
                    {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button onClick={() => removeColumn(i)} className="p-1.5 text-[#6B7280] hover:text-[#EF4444] transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addColumn} className="mt-2 flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add column
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors">
              {creating ? 'Creating...' : 'Create base'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {baseList.length === 0 ? (
        <div className="text-center py-16">
          <Database className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">No bases yet. Create one to store structured data.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {baseList.map(base => (
            <div key={base.id} className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all group">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/bases/${base.id}?workspace=${workspaceId}`} className="flex-1 mr-2">
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">{base.name}</h3>
                  {base.description && <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{base.description}</p>}
                </Link>
                <button
                  onClick={() => handleDelete(base.id, base.name)}
                  className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs font-mono text-[#F5F5F5]">{base.rowCount}</p>
                  <p className="text-xs text-[#6B7280]">rows</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-[#F5F5F5]">{(base.schema as BaseColumn[]).length}</p>
                  <p className="text-xs text-[#6B7280]">columns</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
