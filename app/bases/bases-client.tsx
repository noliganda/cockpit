'use client'
import { useState } from 'react'
import { Plus, Database, ChevronRight, ChevronDown, ExternalLink, Table2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface NcTable {
  id: string
  title: string
}

interface NcBase {
  id: string
  title: string
  tables: NcTable[]
}

interface CreateTableForm {
  baseId: string
  title: string
  columns: Array<{ title: string; uidt: string }>
}

const COLUMN_TYPES = [
  { value: 'SingleLineText', label: 'Text' },
  { value: 'LongText', label: 'Long Text' },
  { value: 'Number', label: 'Number' },
  { value: 'Decimal', label: 'Decimal' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Date', label: 'Date' },
  { value: 'DateTime', label: 'Date & Time' },
  { value: 'Email', label: 'Email' },
  { value: 'URL', label: 'URL' },
  { value: 'PhoneNumber', label: 'Phone' },
]

export function BasesClient({ initialBases }: { initialBases: NcBase[] }) {
  const [bases, setBases] = useState(initialBases)
  const [expandedBases, setExpandedBases] = useState<Set<string>>(
    new Set(initialBases.map(b => b.id))
  )
  const [createForm, setCreateForm] = useState<CreateTableForm | null>(null)
  const [creating, setCreating] = useState(false)

  const nocoPublicUrl = process.env.NEXT_PUBLIC_NOCODB_URL

  function toggleBase(id: string) {
    setExpandedBases(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openCreateTable(baseId: string) {
    setCreateForm({
      baseId,
      title: '',
      columns: [{ title: 'Name', uidt: 'SingleLineText' }],
    })
  }

  function addColumn() {
    setCreateForm(prev => prev ? {
      ...prev,
      columns: [...prev.columns, { title: '', uidt: 'SingleLineText' }],
    } : null)
  }

  function updateColumn(i: number, field: 'title' | 'uidt', value: string) {
    setCreateForm(prev => prev ? {
      ...prev,
      columns: prev.columns.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
    } : null)
  }

  function removeColumn(i: number) {
    setCreateForm(prev => prev ? {
      ...prev,
      columns: prev.columns.filter((_, idx) => idx !== i),
    } : null)
  }

  async function handleCreateTable() {
    if (!createForm?.title.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`/api/nocodb/api/v1/db/meta/projects/${createForm.baseId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title.trim(),
          columns: createForm.columns.filter(c => c.title.trim()),
        }),
      })
      if (res.ok) {
        const table = await res.json() as NcTable
        setBases(prev => prev.map(b =>
          b.id === createForm.baseId ? { ...b, tables: [...b.tables, table] } : b
        ))
        setCreateForm(null)
        toast.success('Table created')
      } else {
        toast.error('Failed to create table')
      }
    } catch {
      toast.error('Error creating table')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Bases</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">NocoDB data tables</p>
        </div>
        {nocoPublicUrl && (
          <a
            href={nocoPublicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open NocoDB
          </a>
        )}
      </div>

      {bases.length === 0 ? (
        <div className="text-center py-16">
          <Database className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">No bases found. Check your NocoDB connection.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bases.map(base => (
            <div key={base.id} className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
              {/* Base header */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-[#1A1A1A] transition-colors">
                <button
                  onClick={() => toggleBase(base.id)}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  {expandedBases.has(base.id)
                    ? <ChevronDown className="w-4 h-4 text-[#6B7280] shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-[#6B7280] shrink-0" />
                  }
                  <Database className="w-4 h-4 text-[#6B7280] shrink-0" />
                  <span className="text-sm font-semibold text-[#F5F5F5] truncate">{base.title}</span>
                  <span className="text-xs text-[#4B5563] ml-1 shrink-0">{base.tables.length} tables</span>
                </button>
                <button
                  onClick={() => openCreateTable(base.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] rounded-[4px] transition-colors shrink-0 ml-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New table
                </button>
              </div>

              {/* Tables list */}
              {expandedBases.has(base.id) && (
                <div className="border-t border-[rgba(255,255,255,0.04)]">
                  {base.tables.length === 0 ? (
                    <p className="px-10 py-3 text-xs text-[#4B5563]">No tables yet.</p>
                  ) : (
                    base.tables.map(table => (
                      <Link
                        key={table.id}
                        href={`/bases/${table.id}?base=${base.id}&name=${encodeURIComponent(table.title)}`}
                        className="flex items-center gap-2.5 px-10 py-2.5 hover:bg-[#1A1A1A] transition-colors group"
                      >
                        <Table2 className="w-3.5 h-3.5 text-[#4B5563] group-hover:text-[#6B7280] shrink-0" />
                        <span className="text-sm text-[#A0A0A0] group-hover:text-[#F5F5F5] transition-colors">{table.title}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create table dialog */}
      {createForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setCreateForm(null)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#F5F5F5]">Create Table</h2>
              <button
                onClick={() => setCreateForm(null)}
                className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={createForm.title}
                onChange={e => setCreateForm(prev => prev ? { ...prev, title: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreateTable() }}
                placeholder="Table name"
                autoFocus
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />

              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Columns</p>
                <div className="space-y-2">
                  {createForm.columns.map((col, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={col.title}
                        onChange={e => updateColumn(i, 'title', e.target.value)}
                        placeholder="Column name"
                        className="flex-1 px-2.5 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
                      />
                      <select
                        value={col.uidt}
                        onChange={e => updateColumn(i, 'uidt', e.target.value)}
                        className="px-2.5 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
                      >
                        {COLUMN_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeColumn(i)}
                        className="p-1.5 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addColumn}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add column
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => void handleCreateTable()}
                  disabled={creating || !createForm.title.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
                >
                  {creating ? 'Creating…' : 'Create table'}
                </button>
                <button
                  onClick={() => setCreateForm(null)}
                  className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
