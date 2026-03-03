'use client'
import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef as TanColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  ArrowLeft, Plus, Trash2, Download, Search, X, ChevronUp, ChevronDown,
  Hash, Type, Calendar, CheckSquare, Mail, Link2, AlignLeft, List,
  ChevronRight, ChevronLeft, Settings2, Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { ColumnDef, RowData } from './page'

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'longtext', label: 'Long Text', icon: AlignLeft },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'select', label: 'Select', icon: List },
  { value: 'multiselect', label: 'Multi-select', icon: List },
  { value: 'url', label: 'URL', icon: Link2 },
  { value: 'email', label: 'Email', icon: Mail },
]

function getFieldIcon(fieldType: string) {
  return FIELD_TYPES.find(f => f.value === fieldType)?.icon ?? Type
}

const PAGE_SIZE = 50

interface Props {
  tableId: string
  tableName: string
  baseName: string
  baseId: string
  initialColumns: ColumnDef[]
  initialRows: RowData[]
  totalRows: number
}

type EditCell = { rowId: string; colId: string } | null

export function TableEditorClient({
  tableId, tableName, baseName, initialColumns, initialRows, totalRows: initialTotal,
}: Props) {
  const [columns, setColumns] = useState(initialColumns)
  const [rows, setRows] = useState(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [editCell, setEditCell] = useState<EditCell>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [addColOpen, setAddColOpen] = useState(false)
  const [newCol, setNewCol] = useState({ name: '', fieldType: 'text' })
  const [saving, setSaving] = useState(false)
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set())
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editCell) {
      setTimeout(() => editRef.current?.focus(), 30)
    }
  }, [editCell])

  // TanStack columns definition
  const tanColumns = useMemo<TanColumnDef<RowData>[]>(() => {
    return columns.map(col => ({
      id: col.id,
      accessorFn: (row) => (row.data as Record<string, unknown>)[col.id],
      header: col.name,
      cell: () => null, // We render cells manually
      enableSorting: true,
      enableColumnFilter: false,
    }))
  }, [columns])

  const tableData = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(row =>
      Object.values(row.data).some(v => String(v ?? '').toLowerCase().includes(q))
    )
  }, [rows, search])

  const tanTable = useReactTable({
    data: tableData,
    columns: tanColumns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
  })

  const sortedRows = tanTable.getRowModel().rows

  const loadPage = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tables/t/${tableId}/rows?page=${p}&limit=${PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json() as { rows: RowData[]; total: number }
        setRows(data.rows.map(r => ({
          ...r,
          data: r.data as Record<string, unknown>,
        })))
        setTotal(data.total)
        setPage(p)
        setSearch('')
      } else {
        toast.error('Failed to load page')
      }
    } catch {
      toast.error('Error loading page')
    } finally {
      setLoading(false)
    }
  }, [tableId])

  const startEdit = useCallback((rowId: string, colId: string, value: unknown) => {
    setEditCell({ rowId, colId })
    setEditValue(value === null || value === undefined ? '' : String(value))
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editCell) return
    const { rowId, colId } = editCell
    const col = columns.find(c => c.id === colId)

    let newValue: unknown = editValue
    if (col?.fieldType === 'checkbox') {
      newValue = editValue === 'true'
    } else if (col?.fieldType === 'number') {
      const n = parseFloat(editValue)
      newValue = isNaN(n) ? null : n
    }

    const row = rows.find(r => r.id === rowId)
    const oldValue = row?.data[colId]
    setEditCell(null)

    if (String(newValue ?? '') === String(oldValue ?? '')) return

    // Optimistic update
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, data: { ...r.data, [colId]: newValue } } : r
    ))

    try {
      const res = await fetch(`/api/tables/t/${tableId}/rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { [colId]: newValue } }),
      })
      if (!res.ok) {
        toast.error('Failed to save')
        setRows(prev => prev.map(r =>
          r.id === rowId ? { ...r, data: { ...r.data, [colId]: oldValue } } : r
        ))
      }
    } catch {
      toast.error('Error saving')
      setRows(prev => prev.map(r =>
        r.id === rowId ? { ...r, data: { ...r.data, [colId]: oldValue } } : r
      ))
    }
  }, [editCell, editValue, columns, rows, tableId])

  const addRow = useCallback(async () => {
    try {
      const res = await fetch(`/api/tables/t/${tableId}/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: {} }),
      })
      if (res.ok) {
        const newRow = await res.json() as RowData
        setRows(prev => [...prev, { ...newRow, data: newRow.data as Record<string, unknown> }])
        setTotal(prev => prev + 1)
      } else {
        toast.error('Failed to add row')
      }
    } catch {
      toast.error('Error adding row')
    }
  }, [tableId])

  const deleteRow = useCallback(async (rowId: string) => {
    setDeletingRows(prev => new Set([...prev, rowId]))
    try {
      const res = await fetch(`/api/tables/t/${tableId}/rows/${rowId}`, { method: 'DELETE' })
      if (res.ok) {
        setRows(prev => prev.filter(r => r.id !== rowId))
        setTotal(prev => prev - 1)
        toast.success('Row deleted')
      } else {
        toast.error('Failed to delete row')
      }
    } catch {
      toast.error('Error deleting row')
    } finally {
      setDeletingRows(prev => { const s = new Set(prev); s.delete(rowId); return s })
    }
  }, [tableId])

  const addColumn = useCallback(async () => {
    if (!newCol.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/tables/t/${tableId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCol.name.trim(), fieldType: newCol.fieldType }),
      })
      if (res.ok) {
        const col = await res.json() as ColumnDef
        setColumns(prev => [...prev, {
          id: col.id,
          name: col.name,
          fieldType: col.fieldType,
          options: col.options,
          sortOrder: col.sortOrder,
          required: col.required,
          defaultValue: col.defaultValue,
        }])
        setAddColOpen(false)
        setNewCol({ name: '', fieldType: 'text' })
        toast.success('Column added')
      } else {
        toast.error('Failed to add column')
      }
    } catch {
      toast.error('Error adding column')
    } finally {
      setSaving(false)
    }
  }, [tableId, newCol])

  const deleteColumn = useCallback(async (colId: string) => {
    if (!confirm('Delete this column and all its data?')) return
    try {
      const res = await fetch(`/api/tables/t/${tableId}/columns/${colId}`, { method: 'DELETE' })
      if (res.ok) {
        setColumns(prev => prev.filter(c => c.id !== colId))
        toast.success('Column deleted')
      } else {
        toast.error('Failed to delete column')
      }
    } catch {
      toast.error('Error deleting column')
    }
  }, [tableId])

  function renderCellDisplay(col: ColumnDef, value: unknown) {
    if (value === null || value === undefined || value === '') {
      return <span className="text-[#3B3B3B]">—</span>
    }
    if (col.fieldType === 'checkbox') {
      return <span>{value ? '✅' : '❌'}</span>
    }
    if (col.fieldType === 'url') {
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3B82F6] hover:underline truncate"
          onClick={e => e.stopPropagation()}
        >
          {String(value)}
        </a>
      )
    }
    if (col.fieldType === 'email') {
      return (
        <a href={`mailto:${String(value)}`} className="text-[#3B82F6] hover:underline truncate" onClick={e => e.stopPropagation()}>
          {String(value)}
        </a>
      )
    }
    if (col.fieldType === 'select') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[rgba(255,255,255,0.07)] text-[#D1D5DB] border border-[rgba(255,255,255,0.08)]">
          {String(value)}
        </span>
      )
    }
    return <span className="truncate text-[#E5E7EB]">{String(value)}</span>
  }

  function renderCellEditor(col: ColumnDef) {
    if (col.fieldType === 'longtext') {
      return (
        <textarea
          ref={editRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => void saveEdit()}
          onKeyDown={e => {
            if (e.key === 'Escape') { setEditCell(null) }
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit() }
          }}
          className="w-full min-h-[80px] px-2 py-1.5 bg-[#1A1A1A] border border-[rgba(255,255,255,0.20)] text-[#F5F5F5] text-xs outline-none resize-none font-mono"
          autoFocus
        />
      )
    }
    if (col.fieldType === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={editValue === 'true'}
          onChange={e => {
            setEditValue(String(e.target.checked))
            setTimeout(() => void saveEdit(), 0)
          }}
          className="w-4 h-4 accent-[#3B82F6]"
          autoFocus
        />
      )
    }
    const inputType = col.fieldType === 'number' ? 'number'
      : col.fieldType === 'date' ? 'date'
      : col.fieldType === 'email' ? 'email'
      : col.fieldType === 'url' ? 'url'
      : 'text'

    return (
      <input
        ref={editRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={() => void saveEdit()}
        onKeyDown={e => {
          if (e.key === 'Escape') { setEditCell(null) }
          if (e.key === 'Enter') { void saveEdit() }
          if (e.key === 'Tab') { void saveEdit() }
        }}
        className="w-full px-2 py-1.5 bg-[#1A1A1A] border border-[rgba(255,255,255,0.20)] text-[#F5F5F5] text-xs outline-none font-mono"
        autoFocus
      />
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Export handlers
  const handleExport = useCallback(async (format: 'md' | 'csv' | 'json') => {
    const a = document.createElement('a')
    a.href = `/api/tables/t/${tableId}/export?format=${format}`
    a.click()
    toast.success(`Exporting as .${format}`)
  }, [tableId])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <Link href="/bases" className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">{baseName}</span>
            <span className="text-xs text-[#3B3B3B]">/</span>
            <h1 className="text-sm font-semibold text-[#F5F5F5] truncate">{tableName}</h1>
          </div>
          <p className="text-xs text-[#4B5563]">{total} rows · {columns.length} columns</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] group transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {/* Export dropdown via sibling hover pattern — simple click menu */}
          </div>
          <button
            onClick={() => void handleExport('md')}
            className="px-2.5 py-1.5 text-xs rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.08)] text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
          >.md</button>
          <button
            onClick={() => void handleExport('csv')}
            className="px-2.5 py-1.5 text-xs rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.08)] text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
          >.csv</button>
          <button
            onClick={() => void handleExport('json')}
            className="px-2.5 py-1.5 text-xs rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.08)] text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
          >.json</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(255,255,255,0.04)] shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4B5563]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search rows…"
            className="pl-6 pr-7 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.14)] w-40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#F5F5F5]">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {search && (
          <span className="text-xs text-[#6B7280]">{sortedRows.length} of {rows.length}</span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => void addRow()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#141414] border border-[rgba(255,255,255,0.10)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#1E1E1E] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add row
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10">
                {columns.map(col => {
                  const Icon = getFieldIcon(col.fieldType)
                  const tanCol = tanTable.getColumn(col.id)
                  const sorted = tanCol?.getIsSorted()
                  return (
                    <th
                      key={col.id}
                      className="bg-[#0F0F0F] border-b border-r border-[rgba(255,255,255,0.06)] px-3 py-2 text-left whitespace-nowrap group"
                      style={{ minWidth: col.fieldType === 'longtext' ? 240 : 160 }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => tanCol?.toggleSorting()}
                          className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#A0A0A0] transition-colors uppercase tracking-wide"
                        >
                          <Icon className="w-3 h-3 shrink-0" />
                          {col.name}
                          {sorted === 'asc' && <ChevronUp className="w-3 h-3" />}
                          {sorted === 'desc' && <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => void deleteColumn(col.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[#4B5563] hover:text-[#EF4444] transition-all"
                          title="Delete column"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  )
                })}
                {/* Add column button header */}
                <th className="bg-[#0F0F0F] border-b border-[rgba(255,255,255,0.06)] px-2 py-2 w-10">
                  <button
                    onClick={() => setAddColOpen(true)}
                    className="p-0.5 text-[#4B5563] hover:text-[#A0A0A0] transition-colors"
                    title="Add column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </th>
                {/* Delete row column header */}
                <th className="bg-[#0F0F0F] border-b border-[rgba(255,255,255,0.06)] w-8" />
              </tr>
            </thead>
            <tbody>
              {columns.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center text-sm text-[#4B5563]">
                    No columns yet.{' '}
                    <button onClick={() => setAddColOpen(true)} className="text-[#6B7280] hover:text-[#F5F5F5] underline">
                      Add a column
                    </button>
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-4 py-16 text-center text-sm text-[#4B5563]">
                    {search ? 'No rows match your search.' : 'No rows yet. Click "Add row" to get started.'}
                  </td>
                </tr>
              ) : (
                sortedRows.map(tanRow => {
                  const row = tanRow.original
                  const isDeleting = deletingRows.has(row.id)
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group/row ${isDeleting ? 'opacity-40' : ''}`}
                    >
                      {columns.map(col => {
                        const isEditing = editCell?.rowId === row.id && editCell?.colId === col.id
                        const value = row.data[col.id]
                        return (
                          <td
                            key={col.id}
                            className="border-r border-[rgba(255,255,255,0.04)] px-0 py-0 relative"
                            style={{ minWidth: col.fieldType === 'longtext' ? 240 : 160 }}
                            onClick={() => !isEditing && startEdit(row.id, col.id, value)}
                          >
                            {isEditing ? (
                              <div className="w-full">
                                {renderCellEditor(col)}
                              </div>
                            ) : (
                              <div className="px-3 py-2 text-xs font-mono cursor-pointer min-h-[32px] flex items-center">
                                {renderCellDisplay(col, value)}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      {/* Spacer for add col button */}
                      <td className="w-10 border-r border-[rgba(255,255,255,0.04)]" />
                      {/* Delete row */}
                      <td className="w-8 px-1">
                        <button
                          onClick={() => void deleteRow(row.id)}
                          disabled={isDeleting}
                          className="opacity-0 group-hover/row:opacity-100 p-1 rounded-[4px] text-[#4B5563] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-all disabled:opacity-30"
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer: pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <p className="text-xs text-[#6B7280]">
            Page {page} of {totalPages} · {total} total rows
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void loadPage(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => void loadPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Add Column Dialog */}
      {addColOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAddColOpen(false)} />
          <div className="relative z-10 w-full max-w-xs mx-4 rounded-[12px] bg-[#141414] border border-[rgba(255,255,255,0.10)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#F5F5F5]">Add Column</h2>
              <button onClick={() => setAddColOpen(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={newCol.name}
                onChange={e => setNewCol(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') void addColumn() }}
                placeholder="Column name"
                autoFocus
                className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {FIELD_TYPES.map(ft => {
                  const Icon = ft.icon
                  return (
                    <button
                      key={ft.value}
                      onClick={() => setNewCol(prev => ({ ...prev, fieldType: ft.value }))}
                      className={`flex flex-col items-center gap-1 px-2 py-2 rounded-[6px] border text-xs transition-colors ${
                        newCol.fieldType === ft.value
                          ? 'border-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.06)] text-[#F5F5F5]'
                          : 'border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] text-[#6B7280] hover:text-[#A0A0A0]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {ft.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => void addColumn()}
                  disabled={saving || !newCol.name.trim()}
                  className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Adding…' : 'Add column'}
                </button>
                <button onClick={() => setAddColOpen(false)} className="px-3 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
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
