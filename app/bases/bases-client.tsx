'use client'
import { useState, useCallback } from 'react'
import {
  Plus, Database, ChevronRight, ChevronDown, Table2, X,
  Pencil, Trash2, MoreHorizontal, Hash, Type,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { BaseWithTables } from './page'

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'longtext', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
]

const WORKSPACES = [
  { id: 'byron-film', label: 'Byron Film' },
  { id: 'korus', label: 'KORUS Group' },
  { id: 'personal', label: 'Personal' },
]

type CreateBaseForm = { name: string; workspaceId: string; description: string }
type CreateTableForm = {
  baseId: string
  name: string
  columns: Array<{ name: string; fieldType: string }>
}

export function BasesClient({ initialBases }: { initialBases: BaseWithTables[] }) {
  const [bases, setBases] = useState(initialBases)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(initialBases.map(b => b.id))
  )
  const [createBaseOpen, setCreateBaseOpen] = useState(false)
  const [createTableForm, setCreateTableForm] = useState<CreateTableForm | null>(null)
  const [baseForm, setBaseForm] = useState<CreateBaseForm>({ name: '', workspaceId: 'byron-film', description: '' })
  const [saving, setSaving] = useState(false)
  const [renameBase, setRenameBase] = useState<{ id: string; name: string } | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  function toggleBase(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreateBase = useCallback(async () => {
    if (!baseForm.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tables/bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: baseForm.name.trim(),
          workspaceId: baseForm.workspaceId,
          description: baseForm.description || undefined,
        }),
      })
      if (res.ok) {
        const base = await res.json() as BaseWithTables
        setBases(prev => [...prev, { ...base, tables: [] }])
        setExpanded(prev => new Set([...prev, base.id]))
        setCreateBaseOpen(false)
        setBaseForm({ name: '', workspaceId: 'byron-film', description: '' })
        toast.success('Base created')
      } else {
        toast.error('Failed to create base')
      }
    } catch {
      toast.error('Error creating base')
    } finally {
      setSaving(false)
    }
  }, [baseForm])

  const handleDeleteBase = useCallback(async (id: string) => {
    if (!confirm('Delete this base and all its tables? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/tables/bases/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBases(prev => prev.filter(b => b.id !== id))
        toast.success('Base deleted')
      } else {
        toast.error('Failed to delete base')
      }
    } catch {
      toast.error('Error deleting base')
    }
    setOpenMenu(null)
  }, [])

  const handleRenameBase = useCallback(async () => {
    if (!renameBase?.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tables/bases/${renameBase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameBase.name.trim() }),
      })
      if (res.ok) {
        const updated = await res.json() as { id: string; name: string }
        setBases(prev => prev.map(b => b.id === updated.id ? { ...b, name: updated.name } : b))
        setRenameBase(null)
        toast.success('Base renamed')
      } else {
        toast.error('Failed to rename base')
      }
    } catch {
      toast.error('Error renaming base')
    } finally {
      setSaving(false)
    }
  }, [renameBase])

  const handleCreateTable = useCallback(async () => {
    if (!createTableForm?.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tables/${createTableForm.baseId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createTableForm.name.trim(),
          columns: createTableForm.columns.filter(c => c.name.trim()).map(c => ({
            name: c.name.trim(),
            fieldType: c.fieldType,
          })),
        }),
      })
      if (res.ok) {
        const table = await res.json() as { id: string; name: string; icon: string | null }
        setBases(prev => prev.map(b =>
          b.id === createTableForm.baseId
            ? { ...b, tables: [...b.tables, { id: table.id, name: table.name, icon: table.icon }] }
            : b
        ))
        setCreateTableForm(null)
        toast.success('Table created')
      } else {
        toast.error('Failed to create table')
      }
    } catch {
      toast.error('Error creating table')
    } finally {
      setSaving(false)
    }
  }, [createTableForm])

  const handleDeleteTable = useCallback(async (baseId: string, tableId: string) => {
    if (!confirm('Delete this table and all its data?')) return
    try {
      const res = await fetch(`/api/tables/t/${tableId}`, { method: 'DELETE' })
      if (res.ok) {
        setBases(prev => prev.map(b =>
          b.id === baseId ? { ...b, tables: b.tables.filter(t => t.id !== tableId) } : b
        ))
        toast.success('Table deleted')
      } else {
        toast.error('Failed to delete table')
      }
    } catch {
      toast.error('Error deleting table')
    }
  }, [])

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r border-[rgba(255,255,255,0.06)] flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Bases</h2>
          <button
            onClick={() => setCreateBaseOpen(true)}
            className="p-1 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
            title="New base"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 py-2">
          {bases.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Database className="w-6 h-6 text-[#4B5563] mx-auto mb-2" />
              <p className="text-xs text-[#4B5563]">No bases yet.</p>
              <button
                onClick={() => setCreateBaseOpen(true)}
                className="mt-2 text-xs text-[#6B7280] hover:text-[#F5F5F5] underline"
              >
                Create one
              </button>
            </div>
          ) : (
            bases.map(base => (
              <div key={base.id}>
                <div className="flex items-center group px-2 py-0.5">
                  <button
                    onClick={() => toggleBase(base.id)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 rounded-[5px] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  >
                    {expanded.has(base.id)
                      ? <ChevronDown className="w-3 h-3 text-[#4B5563] shrink-0" />
                      : <ChevronRight className="w-3 h-3 text-[#4B5563] shrink-0" />
                    }
                    <Database className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                    <span className="text-xs font-medium text-[#D1D5DB] truncate">{base.name}</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === base.id ? null : base.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-[4px] text-[#4B5563] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-all"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {openMenu === base.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-6 z-50 w-40 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] shadow-xl py-1">
                          <button
                            onClick={() => { setRenameBase({ id: base.id, name: base.name }); setOpenMenu(null) }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#D1D5DB] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          <button
                            onClick={() => void handleDeleteBase(base.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete base
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {expanded.has(base.id) && (
                  <div className="ml-4 mb-1">
                    {base.tables.map(table => (
                      <div key={table.id} className="flex items-center group/row">
                        <Link
                          href={`/bases/${table.id}`}
                          className="flex items-center gap-1.5 flex-1 min-w-0 px-3 py-1.5 rounded-[5px] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                        >
                          <Table2 className="w-3 h-3 text-[#4B5563] shrink-0" />
                          <span className="text-xs text-[#A0A0A0] hover:text-[#F5F5F5] truncate transition-colors">{table.name}</span>
                        </Link>
                        <button
                          onClick={() => void handleDeleteTable(base.id, table.id)}
                          className="opacity-0 group-hover/row:opacity-100 p-1 mr-1 rounded-[4px] text-[#4B5563] hover:text-[#EF4444] transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setCreateTableForm({
                        baseId: base.id,
                        name: '',
                        columns: [{ name: 'Name', fieldType: 'text' }],
                      })}
                      className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-[#4B5563] hover:text-[#A0A0A0] transition-colors rounded-[5px] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <Plus className="w-3 h-3" />
                      New table
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto mb-4">
            <Database className="w-7 h-7 text-[#6B7280]" />
          </div>
          <h2 className="text-lg font-semibold text-[#F5F5F5] mb-2">Select a table</h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Choose a table from the sidebar to view and edit its data, or create a new base to get started.
          </p>
          <button
            onClick={() => setCreateBaseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[8px] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New base
          </button>
        </div>
      </div>

      {/* Create Base Dialog */}
      {createBaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateBaseOpen(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#F5F5F5]">New Base</h2>
              <button onClick={() => setCreateBaseOpen(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={baseForm.name}
                onChange={e => setBaseForm(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreateBase() }}
                placeholder="Base name"
                autoFocus
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <select
                value={baseForm.workspaceId}
                onChange={e => setBaseForm(prev => ({ ...prev, workspaceId: e.target.value }))}
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none"
              >
                {WORKSPACES.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
              <input
                value={baseForm.description}
                onChange={e => setBaseForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => void handleCreateBase()}
                  disabled={saving || !baseForm.name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Creating…' : 'Create base'}
                </button>
                <button onClick={() => setCreateBaseOpen(false)} className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Base Dialog */}
      {renameBase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenameBase(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#F5F5F5]">Rename Base</h2>
              <button onClick={() => setRenameBase(null)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={renameBase.name}
                onChange={e => setRenameBase(prev => prev ? { ...prev, name: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter') void handleRenameBase() }}
                autoFocus
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void handleRenameBase()}
                  disabled={saving || !renameBase.name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setRenameBase(null)} className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Table Dialog */}
      {createTableForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateTableForm(null)} />
          <div className="relative z-10 w-full max-w-md mx-4 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#F5F5F5]">New Table</h2>
              <button onClick={() => setCreateTableForm(null)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={createTableForm.name}
                onChange={e => setCreateTableForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreateTable() }}
                placeholder="Table name"
                autoFocus
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />

              <div>
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-2 font-medium">Columns</p>
                <div className="space-y-2">
                  {createTableForm.columns.map((col, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)]">
                        {col.fieldType === 'number' ? <Hash className="w-3 h-3 text-[#4B5563] shrink-0" /> : <Type className="w-3 h-3 text-[#4B5563] shrink-0" />}
                        <input
                          value={col.name}
                          onChange={e => setCreateTableForm(prev => prev ? {
                            ...prev,
                            columns: prev.columns.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c),
                          } : null)}
                          placeholder="Column name"
                          className="flex-1 bg-transparent text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none"
                        />
                      </div>
                      <select
                        value={col.fieldType}
                        onChange={e => setCreateTableForm(prev => prev ? {
                          ...prev,
                          columns: prev.columns.map((c, idx) => idx === i ? { ...c, fieldType: e.target.value } : c),
                        } : null)}
                        className="px-2 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] text-xs outline-none"
                      >
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      {i > 0 && (
                        <button
                          onClick={() => setCreateTableForm(prev => prev ? {
                            ...prev,
                            columns: prev.columns.filter((_, idx) => idx !== i),
                          } : null)}
                          className="p-1.5 text-[#4B5563] hover:text-[#EF4444] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setCreateTableForm(prev => prev ? {
                    ...prev,
                    columns: [...prev.columns, { name: '', fieldType: 'text' }],
                  } : null)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add column
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => void handleCreateTable()}
                  disabled={saving || !createTableForm.name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Creating…' : 'Create table'}
                </button>
                <button onClick={() => setCreateTableForm(null)} className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
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
