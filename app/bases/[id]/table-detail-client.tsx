'use client'
import { useState, useRef, useMemo } from 'react'
import {
  ArrowLeft, Search, Download, Plus, Trash2, X,
  Hash, Type, Calendar, CheckSquare, Mail, Link2, Phone, AlignLeft,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface NcColumn {
  id: string
  title: string
  uidt: string
  system?: boolean
}

interface Props {
  tableId: string
  baseId: string
  tableName: string
  columns: NcColumn[]
  initialRows: Record<string, unknown>[]
  totalRows: number
  error: string | null
}

const NUM_TYPES = new Set(['Number', 'Decimal', 'Currency', 'Rating', 'Percent'])
type AggFunc = 'none' | 'sum' | 'avg' | 'min' | 'max'
const AGG_FUNCS: AggFunc[] = ['none', 'sum', 'avg', 'min', 'max']

const TYPE_ICONS: Record<string, React.ElementType> = {
  Number: Hash,
  Decimal: Hash,
  Currency: Hash,
  Rating: Hash,
  Percent: Hash,
  Checkbox: CheckSquare,
  Date: Calendar,
  DateTime: Calendar,
  Email: Mail,
  URL: Link2,
  PhoneNumber: Phone,
  LongText: AlignLeft,
}

function getTypeIcon(uidt: string) {
  return TYPE_ICONS[uidt] ?? Type
}

const PAGE_SIZE = 50

export function TableDetailClient({
  tableId, baseId, tableName, columns, initialRows, totalRows: initialTotal, error,
}: Props) {
  const [rows, setRows] = useState(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editCell, setEditCell] = useState<{ rowId: unknown; colTitle: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [aggFuncs, setAggFuncs] = useState<Record<string, AggFunc>>({})
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Filter out ID-type column from display (still present in row data for CRUD)
  const displayColumns = useMemo(
    () => columns.filter(c => c.uidt !== 'ID'),
    [columns]
  )

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    )
  }, [rows, search])

  const numCols = useMemo(
    () => displayColumns.filter(c => NUM_TYPES.has(c.uidt)),
    [displayColumns]
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function getRowId(row: Record<string, unknown>): unknown {
    return row.Id ?? row.id
  }

  async function loadPage(p: number) {
    setLoading(true)
    try {
      const offset = (p - 1) * PAGE_SIZE
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}?limit=${PAGE_SIZE}&offset=${offset}`
      )
      if (res.ok) {
        const data = await res.json() as { list: Record<string, unknown>[]; pageInfo: { totalRows: number } }
        setRows(data.list)
        setTotal(data.pageInfo.totalRows)
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
  }

  function startEdit(rowId: unknown, colTitle: string, value: unknown) {
    setEditCell({ rowId, colTitle })
    setEditValue(value === null || value === undefined ? '' : String(value))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function saveEdit() {
    if (!editCell) return
    const col = displayColumns.find(c => c.title === editCell.colTitle)

    let newValue: unknown = editValue
    if (col?.uidt === 'Checkbox') {
      newValue = editValue === 'true'
    } else if (col && NUM_TYPES.has(col.uidt)) {
      const n = parseFloat(editValue)
      newValue = isNaN(n) ? null : n
    }

    // Find the row and check if value changed
    const row = rows.find(r => getRowId(r) === editCell.rowId)
    const oldValue = row?.[editCell.colTitle]
    setEditCell(null)

    if (String(newValue ?? '') === String(oldValue ?? '')) return

    // Optimistic update
    setRows(prev => prev.map(r =>
      getRowId(r) === editCell.rowId ? { ...r, [editCell.colTitle]: newValue } : r
    ))

    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}/${editCell.rowId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [editCell.colTitle]: newValue }),
        }
      )
      if (!res.ok) {
        toast.error('Failed to save')
        setRows(prev => prev.map(r =>
          getRowId(r) === editCell.rowId ? { ...r, [editCell.colTitle]: oldValue } : r
        ))
      }
    } catch {
      toast.error('Error saving')
    }
  }

  async function addRow() {
    const emptyRow = Object.fromEntries(displayColumns.map(c => [c.title, '']))
    try {
      const res = await fetch(`/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyRow),
      })
      if (res.ok) {
        const newRow = await res.json() as Record<string, unknown>
        setRows(prev => [...prev, newRow])
        setTotal(prev => prev + 1)
      } else {
        toast.error('Failed to add row')
      }
    } catch {
      toast.error('Error adding row')
    }
  }

  async function deleteRow(row: Record<string, unknown>) {
    const rowId = getRowId(row)
    if (!confirm('Delete this row?')) return
    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setRows(prev => prev.filter(r => getRowId(r) !== rowId))
        setTotal(prev => prev - 1)
        toast.success('Row deleted')
      } else {
        toast.error('Failed to delete row')
      }
    } catch {
      toast.error('Error deleting row')
    }
  }

  function exportCSV() {
    if (displayColumns.length === 0) return
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const header = displayColumns.map(c => esc(c.title)).join(',')
    const body = filteredRows
      .map(row => displayColumns.map(c => esc(row[c.title])).join(','))
      .join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${tableName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  function cycleAgg(colTitle: string) {
    const cur = aggFuncs[colTitle] ?? 'none'
    const next = AGG_FUNCS[(AGG_FUNCS.indexOf(cur) + 1) % AGG_FUNCS.length]
    setAggFuncs(prev => ({ ...prev, [colTitle]: next }))
  }

  function computeAgg(colTitle: string, func: AggFunc): string {
    if (func === 'none') return '—'
    const nums = filteredRows
      .map(r => parseFloat(String(r[colTitle] ?? '')))
      .filter(n => !isNaN(n))
    if (nums.length === 0) return '—'
    const sum = nums.reduce((a, b) => a + b, 0)
    switch (func) {
      case 'sum': return sum.toLocaleString()
      case 'avg': return (sum / nums.length).toFixed(2)
      case 'min': return Math.min(...nums).toLocaleString()
      case 'max': return Math.max(...nums).toLocaleString()
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <Link href="/bases" className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] mb-6 w-fit">
          <ArrowLeft className="w-4 h-4" />
          Back to Bases
        </Link>
        <div className="text-center py-16">
          <p className="text-sm text-[#EF4444]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/bases" className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{tableName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] font-mono">
            {total} rows · {displayColumns.length} cols
          </span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4B5563]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter rows…"
            className="pl-6 pr-7 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.16)] w-40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#F5F5F5]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {search && (
          <span className="text-xs text-[#6B7280]">{filteredRows.length} of {rows.length}</span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => void addRow()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add row
        </button>
      </div>

      {/* Table */}
      <div className="rounded-[8px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                {displayColumns.map(col => {
                  const Icon = getTypeIcon(col.uidt)
                  return (
                    <th
                      key={col.id}
                      className="px-3 py-2.5 text-left bg-[#0F0F0F] whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-[#4B5563] shrink-0" />
                        <span className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">
                          {col.title}
                        </span>
                      </div>
                    </th>
                  )
                })}
                <th className="w-10 bg-[#0F0F0F]" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayColumns.length + 1}
                    className="px-3 py-12 text-center text-sm text-[#4B5563]"
                  >
                    {search ? 'No rows match your filter.' : 'No rows yet. Click "Add row" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rowIdx) => {
                  const rowId = getRowId(row)
                  return (
                    <tr
                      key={String(rowId ?? rowIdx)}
                      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1A1A1A] transition-colors group"
                    >
                      {displayColumns.map(col => {
                        const isEditing =
                          editCell?.rowId === rowId && editCell?.colTitle === col.title
                        const value = row[col.title]
                        return (
                          <td
                            key={col.id}
                            className="px-3 py-2 relative cursor-pointer"
                            onClick={() => !isEditing && startEdit(rowId, col.title, value)}
                          >
                            {isEditing ? (
                              col.uidt === 'LongText' ? (
                                <textarea
                                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => void saveEdit()}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') setEditCell(null)
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      void saveEdit()
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full min-h-[60px] px-3 py-2 bg-[#222222] border border-[rgba(255,255,255,0.16)] text-[#F5F5F5] font-mono text-xs outline-none resize-none z-10"
                                  autoFocus
                                />
                              ) : col.uidt === 'Checkbox' ? (
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
                              ) : (
                                <input
                                  ref={inputRef as React.RefObject<HTMLInputElement>}
                                  type={
                                    NUM_TYPES.has(col.uidt)
                                      ? 'number'
                                      : col.uidt === 'Date'
                                      ? 'date'
                                      : col.uidt === 'Email'
                                      ? 'email'
                                      : col.uidt === 'URL'
                                      ? 'url'
                                      : 'text'
                                  }
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={() => void saveEdit()}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') setEditCell(null)
                                    if (e.key === 'Enter') void saveEdit()
                                  }}
                                  className="w-full min-w-[120px] px-0 bg-transparent border-none text-[#F5F5F5] font-mono text-xs outline-none"
                                  autoFocus
                                />
                              )
                            ) : (
                              <span className="block truncate max-w-[240px] font-mono text-xs text-[#F5F5F5]">
                                {col.uidt === 'Checkbox'
                                  ? (value ? '✓' : <span className="text-[#4B5563]">—</span>)
                                  : value === null || value === undefined || value === ''
                                  ? <span className="text-[#4B5563]">—</span>
                                  : String(value)
                                }
                              </span>
                            )}
                          </td>
                        )
                      })}
                      {/* Delete button */}
                      <td className="px-2 py-2 w-10">
                        <button
                          onClick={() => void deleteRow(row)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-[4px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Aggregation footer */}
      {numCols.length > 0 && filteredRows.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs text-[#4B5563] shrink-0 font-mono">Σ</span>
          {numCols.map(col => {
            const func = aggFuncs[col.title] ?? 'none'
            return (
              <button
                key={col.id}
                onClick={() => cycleAgg(col.title)}
                title="Click to cycle aggregation"
                className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-xs hover:bg-[rgba(255,255,255,0.07)] transition-colors shrink-0"
              >
                <span className="text-[#4B5563]">{col.title}:</span>
                {func === 'none' ? (
                  <span className="text-[#4B5563]">—</span>
                ) : (
                  <>
                    <span className="text-[#6B7280] uppercase text-[10px]">{func}</span>
                    <span className="text-[#F5F5F5] font-mono">{computeAgg(col.title, func)}</span>
                  </>
                )}
              </button>
            )
          })}
          {search && (
            <span className="text-xs text-[#6B7280] ml-2 shrink-0">
              (showing {filteredRows.length} of {rows.length})
            </span>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[#6B7280]">
            Page {page} of {totalPages} · {total} total rows
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void loadPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => void loadPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
