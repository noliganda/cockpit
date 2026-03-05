'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  Plus,
  Trash2,
  X,
  ArrowLeft,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Link as LinkIcon,
  Mail,
  Check,
  FolderOpen,
  Layers,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'url' | 'email'

interface UserColumn {
  id: string
  tableId: string
  name: string
  columnType: ColumnType
  options: { choices?: string[] } | null
  order: number
  createdAt: string
}

interface UserRow {
  id: string
  tableId: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface UserTable {
  id: string
  baseId: string
  name: string
  description: string | null
}

interface BaseInfo {
  id: string
  name: string
  workspace: string
  areaId: string | null
  projectId: string | null
  areaName: string | null
  projectName: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMN_TYPES: { value: ColumnType; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'text', label: 'Text', Icon: Type },
  { value: 'number', label: 'Number', Icon: Hash },
  { value: 'date', label: 'Date', Icon: Calendar },
  { value: 'boolean', label: 'Checkbox', Icon: ToggleLeft },
  { value: 'select', label: 'Select', Icon: List },
  { value: 'url', label: 'URL', Icon: LinkIcon },
  { value: 'email', label: 'Email', Icon: Mail },
]

const WORKSPACE_COLORS: Record<string, string> = {
  byron_film: '#D4A017',
  korus: '#008080',
  personal: '#F97316',
}

const inputCls =
  'w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563]'
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

// ─── Column type icon ─────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: ColumnType }) {
  const found = COLUMN_TYPES.find((t) => t.value === type)
  if (!found) return <Type size={11} />
  const { Icon } = found
  return <Icon size={11} />
}

// ─── Add Column Dialog ────────────────────────────────────────────────────────

function AddColumnDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (name: string, type: ColumnType, choices: string[]) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ColumnType>('text')
  const [choicesRaw, setChoicesRaw] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    const choices = type === 'select'
      ? choicesRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    await onAdd(name.trim(), type, choices)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F5F5F5]">Add Column</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Column Name</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Status"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {COLUMN_TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-[6px] text-sm border transition-colors ${
                    type === value
                      ? 'bg-[#222222] border-[rgba(255,255,255,0.16)] text-[#F5F5F5]'
                      : 'bg-[#0A0A0A] border-[rgba(255,255,255,0.06)] text-[#A0A0A0] hover:text-[#F5F5F5]'
                  }`}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {type === 'select' && (
            <div>
              <label className={labelCls}>Choices (comma-separated)</label>
              <input
                className={inputCls}
                value={choicesRaw}
                onChange={(e) => setChoicesRaw(e.target.value)}
                placeholder="Option A, Option B, Option C"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[6px] text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors disabled:opacity-40"
          >
            {saving ? 'Adding…' : 'Add Column'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cell editor ─────────────────────────────────────────────────────────────

function CellEditor({
  value,
  column,
  accentColor,
  onSave,
  onCancel,
}: {
  value: unknown
  column: UserColumn
  accentColor: string
  onSave: (v: unknown) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState(() => {
    if (column.columnType === 'boolean') return value === true || value === 'true'
    return value == null ? '' : String(value)
  })
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  function commit() {
    if (column.columnType === 'boolean') {
      onSave(val)
    } else if (column.columnType === 'number') {
      const n = parseFloat(val as string)
      onSave(isNaN(n) ? null : n)
    } else {
      onSave((val as string).trim() === '' ? null : (val as string).trim())
    }
  }

  if (column.columnType === 'boolean') {
    const checked = val as boolean
    return (
      <button
        className="w-full h-full flex items-center justify-center"
        onClick={() => {
          setVal(!checked)
          onSave(!checked)
        }}
      >
        <div
          className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
          style={checked ? { background: accentColor, borderColor: accentColor } : { borderColor: 'rgba(255,255,255,0.16)', background: '#0A0A0A' }}
        >
          {checked && <Check size={10} className="text-black" />}
        </div>
      </button>
    )
  }

  if (column.columnType === 'select') {
    const choices = column.options?.choices ?? []
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={val as string}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        className="w-full h-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.16)] text-[#F5F5F5] text-xs px-2 outline-none rounded-[4px]"
      >
        <option value="">— none —</option>
        {choices.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={column.columnType === 'date' ? 'date' : column.columnType === 'number' ? 'number' : 'text'}
      value={val as string}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') onCancel()
      }}
      className="w-full h-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.16)] text-[#F5F5F5] text-xs px-2 outline-none font-mono rounded-[4px]"
    />
  )
}

// ─── Cell display ─────────────────────────────────────────────────────────────

function CellDisplay({ value, column, accentColor }: { value: unknown; column: UserColumn; accentColor: string }) {
  if (value == null || value === '') {
    return <span className="text-[#4B5563]">—</span>
  }
  if (column.columnType === 'boolean') {
    const checked = value === true || value === 'true'
    return (
      <div
        className="w-4 h-4 rounded border flex items-center justify-center"
        style={checked ? { background: accentColor, borderColor: accentColor } : { borderColor: 'rgba(255,255,255,0.16)', background: 'transparent' }}
      >
        {checked && <Check size={10} className="text-black" />}
      </div>
    )
  }
  if (column.columnType === 'url') {
    return (
      <a
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-[#3B82F6] hover:underline truncate block max-w-full"
      >
        {String(value)}
      </a>
    )
  }
  if (column.columnType === 'select') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-[#222222] text-[#A0A0A0] border border-[rgba(255,255,255,0.06)]">
        {String(value)}
      </span>
    )
  }
  return <span className="truncate block max-w-full font-mono text-xs">{String(value)}</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TableEditorClient({ baseId, tableId }: { baseId: string; tableId: string }) {
  const [base, setBase] = useState<BaseInfo | null>(null)
  const [table, setTable] = useState<UserTable | null>(null)
  const [columns, setColumns] = useState<UserColumn[]>([])
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editCell, setEditCell] = useState<{ rowId: string; colId: string } | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showAddCol, setShowAddCol] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [deleting, setDeleting] = useState(false)

  const accentColor = WORKSPACE_COLORS[base?.workspace ?? ''] ?? '#D4A017'

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/tables/bases/${baseId}`).then((r) => r.json()),
      fetch(`/api/tables/${baseId}/tables/${tableId}`).then((r) => r.json()),
      fetch(`/api/tables/${tableId}/rows?limit=500`).then((r) => r.json()),
    ]).then(([baseData, tableData, rowData]) => {
      setBase(baseData)
      setTable(tableData)
      setColumns(tableData.columns ?? [])
      setRows(rowData.rows ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [baseId, tableId])

  // ── Row operations ────────────────────────────────────────────────────────
  const addRow = useCallback(async () => {
    const res = await fetch(`/api/tables/${tableId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: {} }),
    })
    if (!res.ok) { toast.error('Failed to add row'); return }
    const row = await res.json()
    setRows((prev) => [...prev, row])
  }, [tableId])

  const updateCell = useCallback(async (rowId: string, colId: string, value: unknown) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row) return
    const newData = { ...row.data, [colId]: value }
    const res = await fetch(`/api/tables/${tableId}/rows/${rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newData }),
    })
    if (!res.ok) { toast.error('Failed to save'); return }
    const updated = await res.json()
    setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)))
  }, [rows, tableId])

  async function deleteSelectedRows() {
    if (selected.size === 0) return
    setDeleting(true)
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/tables/${tableId}/rows/${id}`, { method: 'DELETE' })
      )
    )
    setRows((prev) => prev.filter((r) => !selected.has(r.id)))
    setSelected(new Set())
    setDeleting(false)
    toast.success(`Deleted ${selected.size} row${selected.size > 1 ? 's' : ''}`)
  }

  // ── Column operations ─────────────────────────────────────────────────────
  async function addColumn(name: string, type: ColumnType, choices: string[]) {
    const order = columns.length
    const options = type === 'select' ? { choices } : null
    const res = await fetch(`/api/tables/${tableId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, columnType: type, options, order }),
    })
    if (!res.ok) { toast.error('Failed to add column'); return }
    const col = await res.json()
    setColumns((prev) => [...prev, col])
    setShowAddCol(false)
    toast.success('Column added')
  }

  async function deleteColumn(colId: string, colName: string) {
    if (!confirm(`Delete column "${colName}"? This will remove all cell data for this column.`)) return
    await fetch(`/api/tables/${tableId}/columns/${colId}`, { method: 'DELETE' })
    setColumns((prev) => prev.filter((c) => c.id !== colId))
    toast.success('Column deleted')
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function downloadExport(format: 'csv' | 'json' | 'md') {
    window.open(`/api/tables/${tableId}/export/${format}`, '_blank')
  }

  // ── TanStack Table setup ──────────────────────────────────────────────────
  const columnHelper = createColumnHelper<UserRow>()

  // Inline row-select checkbox — workspace-colored, no native browser styling
  const allSelected = rows.length > 0 && selected.size === rows.length

  const tanColumns: ColumnDef<UserRow, unknown>[] = [
    columnHelper.display({
      id: 'select',
      header: () => (
        <button
          type="button"
          onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(rows.map((r) => r.id)))}
          className="w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors flex-shrink-0"
          style={allSelected
            ? { background: accentColor, borderColor: accentColor }
            : { background: 'transparent', borderColor: accentColor, opacity: 0.6 }
          }
        >
          {allSelected && <Check size={10} className="text-black stroke-[3]" />}
        </button>
      ),
      cell: ({ row }) => {
        const isSelected = selected.has(row.original.id)
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((prev) => {
                const next = new Set(prev)
                if (isSelected) next.delete(row.original.id)
                else next.add(row.original.id)
                return next
              })
            }}
            className="w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors flex-shrink-0"
            style={isSelected
              ? { background: accentColor, borderColor: accentColor }
              : { background: 'transparent', borderColor: accentColor, opacity: 0.6 }
            }
          >
            {isSelected && <Check size={10} className="text-black stroke-[3]" />}
          </button>
        )
      },
      size: 40,
    }),
    ...columns.map((col) =>
      columnHelper.accessor((row) => (row.data as Record<string, unknown>)[col.id], {
        id: col.id,
        header: col.name,
        cell: ({ row, getValue }) => {
          const rowId = row.original.id
          const value = getValue()

          // Boolean — toggle directly, no intermediate edit mode (prevents visual jump)
          if (col.columnType === 'boolean') {
            const checked = value === true || value === 'true'
            return (
              <div
                className="w-full h-full flex items-center cursor-pointer px-1"
                onClick={() => updateCell(rowId, col.id, !checked)}
              >
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                  style={checked
                    ? { background: accentColor, borderColor: accentColor }
                    : { borderColor: 'rgba(255,255,255,0.22)', background: 'transparent' }
                  }
                >
                  {checked && <Check size={10} className="text-black" />}
                </div>
              </div>
            )
          }

          const isEditing = editCell?.rowId === rowId && editCell?.colId === col.id

          if (isEditing) {
            return (
              <CellEditor
                value={value}
                column={col}
                accentColor={accentColor}
                onSave={async (v) => {
                  await updateCell(rowId, col.id, v)
                  setEditCell(null)
                }}
                onCancel={() => setEditCell(null)}
              />
            )
          }

          return (
            <div
              className="w-full h-full cursor-pointer"
              onClick={() => setEditCell({ rowId, colId: col.id })}
            >
              <CellDisplay value={value} column={col} accentColor={accentColor} />
            </div>
          )
        },
        enableSorting: true,
        filterFn: 'includesString',
      })
    ),
  ]

  const tanTable = useReactTable({
    data: rows,
    columns: tanColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'includesString',
  })

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-[#1A1A1A] rounded animate-pulse mb-4" />
        <div className="h-64 bg-[#141414] rounded-[8px] animate-pulse" />
      </div>
    )
  }

  // Breadcrumb back path
  const backToParent = base?.projectId
    ? { href: `/projects/${base.projectId}`, label: base.projectName ?? 'Project', Icon: FolderOpen }
    : base?.areaId
    ? { href: `/areas/${base.areaId}`, label: base.areaName ?? 'Area', Icon: Layers }
    : null

  return (
    // h-full (not min-h-screen) so the layout's scroll container controls height
    <div className="flex flex-col h-full bg-[#0F0F0F]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back to parent (project/area) */}
          {backToParent && (
            <>
              <Link
                href={backToParent.href}
                className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0"
              >
                <backToParent.Icon size={12} />
                {backToParent.label}
              </Link>
              <span className="text-[#4B5563] text-xs">/</span>
            </>
          )}
          {/* Back to base list */}
          <Link
            href={`/bases/${baseId}`}
            className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0"
            title="Back to base"
          >
            <ArrowLeft size={15} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[#F5F5F5] truncate">{table?.name ?? 'Table'}</h1>
            {table?.description && (
              <p className="text-xs text-[#6B7280] truncate">{table.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Export */}
          <div className="flex items-center gap-1">
            {(['csv', 'json', 'md'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => downloadExport(fmt)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-xs text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] border border-transparent hover:border-[rgba(255,255,255,0.06)] transition-colors"
              >
                <Download size={11} />
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Delete selected */}
          {selected.size > 0 && (
            <button
              onClick={deleteSelectedRows}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
            >
              <Trash2 size={11} />
              Delete {selected.size}
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4B5563]" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search rows…"
            className="w-full pl-7 pr-3 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-xs outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563]"
          />
        </div>
        <span className="text-xs text-[#4B5563]">
          {tanTable.getFilteredRowModel().rows.length} rows
        </span>
      </div>

      {/* ── Table (scrollable) ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {columns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center">
            <div className="text-[#4B5563] mb-3">
              <Plus size={32} />
            </div>
            <p className="text-sm text-[#6B7280] mb-1">No columns yet</p>
            <p className="text-xs text-[#4B5563] mb-4">Add columns to start building your table</p>
            <button
              onClick={() => setShowAddCol(true)}
              className="px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors"
            >
              Add first column
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              {columns.map((col) => (
                <col key={col.id} style={{ width: `${Math.max(120, 200)}px` }} />
              ))}
              <col style={{ width: '48px' }} />
            </colgroup>

            {/* Header */}
            <thead className="sticky top-0 z-10 bg-[#0F0F0F]">
              {tanTable.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-[rgba(255,255,255,0.06)]">
                  {hg.headers.map((header) => {
                    const col = columns.find((c) => c.id === header.id)
                    return (
                      <th
                        key={header.id}
                        className="text-left px-3 py-2.5 text-[#6B7280] font-medium tracking-wide border-r border-[rgba(255,255,255,0.04)] last:border-r-0 select-none"
                        style={{ width: header.getSize() }}
                      >
                        <div className="flex items-center gap-1.5 group/col">
                          {col && <TypeIcon type={col.columnType} />}
                          <span
                            className="uppercase text-[10px] cursor-pointer flex items-center gap-1"
                            onClick={col ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === 'asc' && <ChevronUp size={10} />}
                            {header.column.getIsSorted() === 'desc' && <ChevronDown size={10} />}
                          </span>
                          {col && (
                            <button
                              onClick={() => deleteColumn(col.id, col.name)}
                              className="opacity-0 group-hover/col:opacity-100 transition-opacity ml-auto text-[#4B5563] hover:text-[#EF4444]"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </th>
                    )
                  })}
                  {/* Add column header */}
                  <th className="px-2 py-2.5 text-center">
                    <button
                      onClick={() => setShowAddCol(true)}
                      className="text-[#4B5563] hover:text-[#F5F5F5] transition-colors"
                      title="Add column"
                    >
                      <Plus size={13} />
                    </button>
                  </th>
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody>
              {tanTable.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-12 text-center">
                    {globalFilter ? (
                      <span className="text-[#4B5563]">No rows match your search</span>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-sm text-[#6B7280]">No rows yet</span>
                        <button
                          onClick={addRow}
                          className="flex items-center gap-2 px-4 py-2 rounded-[6px] text-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors"
                        >
                          <Plus size={14} />
                          Add first row
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                tanTable.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[#141414] transition-colors ${
                      selected.has(row.original.id) ? 'bg-[#141414]' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-2 border-r border-[rgba(255,255,255,0.04)] last:border-r-0 overflow-hidden"
                        style={{ height: '36px', maxWidth: '200px' }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                    <td />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Row footer — always visible at bottom ───────────────────────── */}
      {columns.length > 0 && (
        <div className="flex-shrink-0 border-t border-[rgba(255,255,255,0.06)] bg-[#0F0F0F] px-4 py-2">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
          >
            <Plus size={13} />
            Add Row
          </button>
        </div>
      )}

      {/* ── Add Column dialog ────────────────────────────────────────────── */}
      {showAddCol && (
        <AddColumnDialog
          onClose={() => setShowAddCol(false)}
          onAdd={addColumn}
        />
      )}
    </div>
  )
}
