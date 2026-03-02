'use client'
import { useState } from 'react'
import { Database, Table2, ChevronDown, ChevronRight, Plus, X, Check, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { NocoBase, NocoTable } from '@/lib/nocodb'

const NOCO_FIELD_TYPES = [
  { value: 'SingleLineText', label: 'Text' },
  { value: 'LongText', label: 'Long Text' },
  { value: 'Number', label: 'Number' },
  { value: 'Decimal', label: 'Decimal' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Date', label: 'Date' },
  { value: 'DateTime', label: 'DateTime' },
  { value: 'Email', label: 'Email' },
  { value: 'URL', label: 'URL' },
  { value: 'PhoneNumber', label: 'Phone' },
  { value: 'SingleSelect', label: 'Single Select' },
  { value: 'MultiSelect', label: 'Multi Select' },
] as const

interface BasesClientProps {
  bases: (NocoBase & { tables: NocoTable[] })[]
}

export function BasesClient({ bases: initialBases }: BasesClientProps) {
  const [bases, setBases] = useState(initialBases)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    // expand all by default
    Object.fromEntries(initialBases.map(b => [b.id, true]))
  )
  const [showCreateTable, setShowCreateTable] = useState<string | null>(null) // baseId
  const [newTableName, setNewTableName] = useState('')
  const [newTableCols, setNewTableCols] = useState<Array<{ title: string; uidt: string }>>([
    { title: 'Name', uidt: 'SingleLineText' },
  ])
  const [creating, setCreating] = useState(false)

  function toggleBase(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function openCreateTable(baseId: string) {
    setShowCreateTable(baseId)
    setNewTableName('')
    setNewTableCols([{ title: 'Name', uidt: 'SingleLineText' }])
  }

  function addCol() {
    setNewTableCols(prev => [...prev, { title: '', uidt: 'SingleLineText' }])
  }

  function updateCol(i: number, field: 'title' | 'uidt', value: string) {
    setNewTableCols(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function removeCol(i: number) {
    setNewTableCols(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleCreateTable() {
    if (!newTableName.trim() || !showCreateTable) return
    setCreating(true)
    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/meta/projects/${showCreateTable}/tables`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: newTableName.trim(),
            columns: newTableCols.filter(c => c.title.trim()),
          }),
        }
      )
      if (res.ok) {
        const table = await res.json() as NocoTable
        setBases(prev =>
          prev.map(b =>
            b.id === showCreateTable
              ? { ...b, tables: [...(b.tables ?? []), table] }
              : b
          )
        )
        setShowCreateTable(null)
        toast.success(`Table "${table.title}" created`)
      } else {
        const err = await res.json().catch(() => ({})) as { message?: string }
        toast.error(err.message ?? 'Failed to create table')
      }
    } catch {
      toast.error('Error creating table')
    } finally {
      setCreating(false)
    }
  }

  if (bases.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Bases</h1>
          <a
            href="http://localhost:8080"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open NocoDB
          </a>
        </div>
        <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-12 text-center">
          <AlertCircle className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#A0A0A0] mb-1">No bases found in NocoDB</p>
          <p className="text-xs text-[#4B5563]">
            Make sure NocoDB is running at{' '}
            <span className="font-mono text-[#6B7280]">localhost:8080</span> and you have created at least one base.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Bases</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {bases.length} base{bases.length !== 1 ? 's' : ''} ·{' '}
            {bases.reduce((sum, b) => sum + (b.tables?.length ?? 0), 0)} tables
          </p>
        </div>
        <a
          href="http://localhost:8080"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open NocoDB
        </a>
      </div>

      {/* Bases */}
      <div className="space-y-4">
        {bases.map(base => (
          <div
            key={base.id}
            className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden"
          >
            {/* Base header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#1A1A1A] transition-colors select-none"
              onClick={() => toggleBase(base.id)}
            >
              <button className="text-[#6B7280] shrink-0">
                {expanded[base.id]
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />}
              </button>
              <Database className="w-4 h-4 text-[#6B7280] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[#F5F5F5]">{base.title}</span>
                <span className="ml-2 text-xs text-[#4B5563] font-mono">{base.tables?.length ?? 0} tables</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); openCreateTable(base.id) }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New table
              </button>
            </div>

            {/* Create table form */}
            {showCreateTable === base.id && (
              <div className="px-4 pb-4 pt-2 border-t border-[rgba(255,255,255,0.04)] bg-[#0F0F0F]">
                <p className="text-xs font-semibold text-[#A0A0A0] mb-3 uppercase tracking-wide">Create table</p>
                <div className="space-y-2 mb-3">
                  <input
                    value={newTableName}
                    onChange={e => setNewTableName(e.target.value)}
                    placeholder="Table name"
                    autoFocus
                    className="w-full px-3 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors"
                  />
                  <div className="space-y-1.5">
                    {newTableCols.map((col, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={col.title}
                          onChange={e => updateCol(i, 'title', e.target.value)}
                          placeholder="Column name"
                          className="flex-1 px-2.5 py-1 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors"
                        />
                        <select
                          value={col.uidt}
                          onChange={e => updateCol(i, 'uidt', e.target.value)}
                          className="px-2 py-1 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-xs outline-none appearance-none"
                        >
                          {NOCO_FIELD_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {newTableCols.length > 1 && (
                          <button onClick={() => removeCol(i)} className="text-[#4B5563] hover:text-[#EF4444] transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addCol}
                    className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#A0A0A0] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add column
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreateTable}
                    disabled={creating || !newTableName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.10)] disabled:opacity-40 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {creating ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateTable(null)}
                    className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tables grid */}
            {expanded[base.id] && (base.tables?.length ?? 0) > 0 && (
              <div className="border-t border-[rgba(255,255,255,0.04)]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-[rgba(255,255,255,0.04)]">
                  {(base.tables ?? []).map(table => (
                    <Link
                      key={table.id}
                      href={`/bases/${table.id}?base=${base.id}&name=${encodeURIComponent(table.title)}`}
                      className="flex items-center gap-3 px-4 py-3 bg-[#141414] hover:bg-[#1A1A1A] transition-colors group"
                    >
                      <Table2 className="w-4 h-4 text-[#4B5563] group-hover:text-[#6B7280] shrink-0 transition-colors" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#F5F5F5] truncate">{table.title}</p>
                        {table.type && table.type !== 'table' && (
                          <p className="text-xs text-[#4B5563] capitalize">{table.type}</p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#4B5563] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty tables state */}
            {expanded[base.id] && (base.tables?.length ?? 0) === 0 && showCreateTable !== base.id && (
              <div className="border-t border-[rgba(255,255,255,0.04)] px-4 py-6 text-center">
                <p className="text-xs text-[#4B5563]">No tables yet.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
