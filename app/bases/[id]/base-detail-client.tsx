'use client'
import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  ArrowLeft, Search, X, Download, Plus, Loader2,
  ChevronLeft, ChevronRight, Hash, Calendar, Mail, Link2,
  ToggleLeft, Type, List, Trash2, Phone, AlignLeft,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { NocoField, NocoRow, NocoPageInfo } from '@/lib/nocodb'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TableDetailClientProps {
  tableId: string
  baseId: string
  tableName: string
  initialFields: NocoField[]
  initialRows: NocoRow[]
  initialPageInfo: NocoPageInfo
}

type AggFunc = 'none' | 'sum' | 'avg' | 'min' | 'max' | 'count'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYSTEM_UIDTS = new Set(['ID', 'AutoNumber', 'CreatedTime', 'LastModifiedTime', 'CreatedBy', 'LastModifiedBy', 'Formula', 'Lookup', 'Rollup', 'Count', 'Links', 'LinkToAnotherRecord'])
const NUMERIC_UIDTS = new Set(['Number', 'Decimal', 'Currency', 'Percent', 'Duration', 'Rating'])
const DATE_UIDTS = new Set(['Date', 'DateTime'])

function isEditable(f: NocoField): boolean {
  return !f.system && !SYSTEM_UIDTS.has(f.uidt) && f.uidt !== 'Attachment' && f.uidt !== 'GeoData'
}

function isNumeric(f: NocoField): boolean {
  return NUMERIC_UIDTS.has(f.uidt)
}

function FieldIcon({ uidt }: { uidt: string }) {
  const cls = 'w-3 h-3 shrink-0'
  if (NUMERIC_UIDTS.has(uidt)) return <Hash className={cls} />
  if (DATE_UIDTS.has(uidt)) return <Calendar className={cls} />
  if (uidt === 'Checkbox') return <ToggleLeft className={cls} />
  if (uidt === 'Email') return <Mail className={cls} />
  if (uidt === 'URL') return <Link2 className={cls} />
  if (uidt === 'PhoneNumber') return <Phone className={cls} />
  if (uidt === 'MultiSelect' || uidt === 'SingleSelect') return <List className={cls} />
  if (uidt === 'LongText') return <AlignLeft className={cls} />
  if (uidt === 'ID' || uidt === 'AutoNumber') return <Hash className={cls} />
  return <Type className={cls} />
}

function formatCellValue(value: unknown, uidt: string): string {
  if (value === null || value === undefined || value === '') return ''
  if (uidt === 'Checkbox') return value ? '✓' : ''
  if (Array.isArray(value)) return value.map(v => (typeof v === 'object' && v !== null ? (v as { title?: string }).title ?? String(v) : String(v))).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function computeAgg(rows: NocoRow[], colTitle: string, func: AggFunc): string {
  if (func === 'none') return ''
  const vals = rows.map(r => r[colTitle])
  if (func === 'count') return String(vals.filter(v => v !== null && v !== undefined && v !== '').length)
  const nums = vals.map(v => parseFloat(String(v))).filter(n => !isNaN(n))
  if (nums.length === 0) return '—'
  const sum = nums.reduce((a, b) => a + b, 0)
  switch (func) {
    case 'sum': return sum.toLocaleString()
    case 'avg': return (sum / nums.length).toFixed(2)
    case 'min': return Math.min(...nums).toLocaleString()
    case 'max': return Math.max(...nums).toLocaleString()
    default: return ''
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TableDetailClient({
  tableId,
  baseId,
  tableName,
  initialFields,
  initialRows,
  initialPageInfo,
}: TableDetailClientProps) {
  const [rows, setRows] = useState<NocoRow[]>(initialRows)
  const [pageInfo, setPageInfo] = useState<NocoPageInfo>(initialPageInfo)
  const [page, setPage] = useState(1)
  const [loadingPage, setLoadingPage] = useState(false)
  const [search, setSearch] = useState('')
  const [editingCell, setEditingCell] = useState<{ rowId: number; colTitle: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingCell, setSavingCell] = useState(false)
  const [aggFuncs, setAggFuncs] = useState<Record<string, AggFunc>>({})
  const [deletingRow, setDeletingRow] = useState<number | null>(null)
  const [addingRow, setAddingRow] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  // Only show non-system fields (except Id which we always show first)
  const displayFields = useMemo(() => {
    const sorted = [...initialFields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return sorted
  }, [initialFields])

  const visibleFields = displayFields.filter(
    f => f.uidt !== 'Attachment' && f.uidt !== 'GeoData' && f.uidt !== 'Barcode' && f.uidt !== 'QrCode'
  )

  // Client-side search filter (searches current page)
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(row =>
      Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
    )
  }, [rows, search])

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus()
      }, 10)
    }
  }, [editingCell])

  // ── Page navigation ───────────────────────────────────────────────────────

  async function loadPage(p: number) {
    setLoadingPage(true)
    try {
      const offset = (p - 1) * 50
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}?limit=50&offset=${offset}`
      )
      if (res.ok) {
        const data = await res.json() as { list: NocoRow[]; pageInfo: NocoPageInfo }
        setRows(data.list)
        setPageInfo(data.pageInfo)
        setPage(p)
      } else {
        toast.error('Failed to load page')
      }
    } finally {
      setLoadingPage(false)
    }
  }

  // ── Cell editing ──────────────────────────────────────────────────────────

  function startEdit(rowId: number, colTitle: string, value: unknown, field: NocoField) {
    if (!isEditable(field)) return
    setEditingCell({ rowId, colTitle })
    if (field.uidt === 'Checkbox') {
      // toggle immediately
      saveToggle(rowId, colTitle, !value)
      return
    }
    setEditValue(
      value === null || value === undefined ? '' :
      Array.isArray(value) ? (value as Array<{ title?: string }>).map(v => v?.title ?? String(v)).join(', ') :
      String(value)
    )
  }

  async function saveToggle(rowId: number, colTitle: string, newVal: boolean) {
    setRows(prev => prev.map(r => r.Id === rowId ? { ...r, [colTitle]: newVal } : r))
    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [colTitle]: newVal }),
        }
      )
      if (!res.ok) {
        toast.error('Failed to save')
        setRows(prev => prev.map(r => r.Id === rowId ? { ...r, [colTitle]: !newVal } : r))
      }
    } catch {
      toast.error('Save error')
    }
  }

  const saveCell = useCallback(async () => {
    if (!editingCell || savingCell) return
    const { rowId, colTitle } = editingCell
    const field = displayFields.find(f => f.title === colTitle)
    if (!field) { setEditingCell(null); return }

    // Determine typed value
    let typedValue: unknown = editValue
    if (NUMERIC_UIDTS.has(field.uidt)) {
      typedValue = editValue === '' ? null : parseFloat(editValue)
    } else if (DATE_UIDTS.has(field.uidt)) {
      typedValue = editValue || null
    }

    setSavingCell(true)
    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [colTitle]: typedValue }),
        }
      )
      if (res.ok) {
        setRows(prev => prev.map(r => r.Id === rowId ? { ...r, [colTitle]: typedValue } : r))
      } else {
        toast.error('Failed to save cell')
      }
    } catch {
      toast.error('Save error')
    } finally {
      setSavingCell(false)
      setEditingCell(null)
    }
  }, [editingCell, editValue, savingCell, baseId, tableId, displayFields])

  function cancelEdit() {
    setEditingCell(null)
    setEditValue('')
  }

  // ── Add row ───────────────────────────────────────────────────────────────

  async function addRow() {
    setAddingRow(true)
    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )
      if (res.ok) {
        const newRow = await res.json() as NocoRow
        setRows(prev => [...prev, newRow])
        setPageInfo(prev => ({ ...prev, totalRows: prev.totalRows + 1 }))
        toast.success('Row added')
      } else {
        toast.error('Failed to add row')
      }
    } catch {
      toast.error('Error adding row')
    } finally {
      setAddingRow(false)
    }
  }

  // ── Delete row ────────────────────────────────────────────────────────────

  async function deleteRow(rowId: number) {
    if (!confirm('Delete this row?')) return
    setDeletingRow(rowId)
    try {
      const res = await fetch(
        `/api/nocodb/api/v1/db/data/noco/${baseId}/${tableId}/${rowId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setRows(prev => prev.filter(r => r.Id !== rowId))
        setPageInfo(prev => ({ ...prev, totalRows: Math.max(0, prev.totalRows - 1) }))
      } else {
        toast.error('Failed to delete row')
      }
    } catch {
      toast.error('Error deleting row')
    } finally {
      setDeletingRow(null)
    }
  }

  // ── CSV Export ────────────────────────────────────────────────────────────

  function exportCSV() {
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const header = visibleFields.map(f => esc(f.title)).join(',')
    const body = filteredRows
      .map(row => visibleFields.map(f => esc(formatCellValue(row[f.title], f.uidt))).join(','))
      .join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${tableName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  // ── Aggregation ───────────────────────────────────────────────────────────

  const numericFields = visibleFields.filter(f => isNumeric(f))

  function cycleAgg(colTitle: string) {
    const funcs: AggFunc[] = ['none', 'sum', 'avg', 'min', 'max', 'count']
    const cur = aggFuncs[colTitle] ?? 'none'
    const next = funcs[(funcs.indexOf(cur) + 1) % funcs.length]
    setAggFuncs(prev => ({ ...prev, [colTitle]: next }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(pageInfo.totalRows / 50))

  return (
    <div className="flex flex-col h-full min-h-0 p-4 md:p-6 max-w-full">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href="/bases" className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#F5F5F5] tracking-tight truncate">{tableName}</h1>
          <p className="text-xs text-[#6B7280] font-mono">
            {pageInfo.totalRows.toLocaleString()} rows · {visibleFields.length} fields
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={addRow}
            disabled={addingRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] disabled:opacity-40 transition-colors"
          >
            {addingRow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add row
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-3 relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4B5563]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search rows…"
          className="w-full pl-8 pr-7 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#F5F5F5] transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Grid */}
      {visibleFields.length === 0 ? (
        <div className="flex-1 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] flex items-center justify-center p-12">
          <p className="text-sm text-[#4B5563]">No fields found for this table.</p>
        </div>
      ) : (
        <div className="flex-1 rounded-[8px] border border-[rgba(255,255,255,0.06)] overflow-auto bg-[#141414]">
          <table className="min-w-full border-collapse text-sm">
            {/* Column headers */}
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0F0F0F] border-b border-[rgba(255,255,255,0.06)]">
                {/* Row # */}
                <th className="px-3 py-2 text-left text-[10px] font-medium text-[#4B5563] uppercase tracking-wide w-10 shrink-0 border-r border-[rgba(255,255,255,0.04)]">
                  #
                </th>
                {visibleFields.map(field => (
                  <th
                    key={field.id}
                    className="px-3 py-2 text-left text-[10px] font-medium text-[#6B7280] uppercase tracking-wide whitespace-nowrap border-r border-[rgba(255,255,255,0.04)] last:border-r-0"
                    style={{ minWidth: field.uidt === 'LongText' ? 240 : field.uidt === 'ID' ? 60 : 140 }}
                  >
                    <div className="flex items-center gap-1.5">
                      <FieldIcon uidt={field.uidt} />
                      <span className="truncate">{field.title}</span>
                      {field.pk && <span className="text-[8px] text-[#4B5563] font-mono">PK</span>}
                    </div>
                  </th>
                ))}
                {/* Delete col */}
                <th className="w-8 border-l border-[rgba(255,255,255,0.04)]" />
              </tr>
            </thead>

            {/* Rows */}
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleFields.length + 2} className="px-4 py-12 text-center text-sm text-[#4B5563]">
                    {search ? 'No rows match your search.' : 'No rows yet. Click "Add row" to get started.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, rowIdx) => {
                  const rowId = typeof row.Id === 'number' ? row.Id : Number(row.Id ?? row.id ?? rowIdx)
                  return (
                    <tr
                      key={rowId}
                      className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#1A1A1A] group transition-colors"
                    >
                      {/* Row number */}
                      <td className="px-3 py-2 text-[10px] font-mono text-[#4B5563] border-r border-[rgba(255,255,255,0.04)] text-right w-10">
                        {(page - 1) * 50 + rowIdx + 1}
                      </td>

                      {/* Cells */}
                      {visibleFields.map(field => {
                        const isEditing =
                          editingCell?.rowId === rowId && editingCell?.colTitle === field.title
                        const cellValue = row[field.title]
                        const editable = isEditable(field)

                        return (
                          <td
                            key={field.id}
                            className={`px-0 py-0 border-r border-[rgba(255,255,255,0.04)] last:border-r-0 align-top ${editable && !isEditing ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (!isEditing && editable) startEdit(rowId, field.title, cellValue, field)
                            }}
                          >
                            {isEditing && field.uidt !== 'Checkbox' ? (
                              <CellEditor
                                field={field}
                                value={editValue}
                                onChange={setEditValue}
                                onSave={saveCell}
                                onCancel={cancelEdit}
                                saving={savingCell}
                                inputRef={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>}
                              />
                            ) : (
                              <div className="px-3 py-2 min-h-[36px] flex items-center">
                                <CellDisplay value={cellValue} field={field} />
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Delete button */}
                      <td className="px-1 py-2 border-l border-[rgba(255,255,255,0.04)] w-8">
                        <button
                          onClick={() => deleteRow(rowId)}
                          disabled={deletingRow === rowId}
                          className="p-1 text-[#4B5563] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all rounded"
                          title="Delete row"
                        >
                          {deletingRow === rowId
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Aggregation footer */}
      {numericFields.length > 0 && rows.length > 0 && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#4B5563] font-mono shrink-0">Σ</span>
          {numericFields.map(field => {
            const func = aggFuncs[field.title] ?? 'none'
            const val = computeAgg(filteredRows, field.title, func)
            return (
              <button
                key={field.id}
                onClick={() => cycleAgg(field.title)}
                title="Click to cycle aggregation"
                className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-xs hover:bg-[rgba(255,255,255,0.07)] transition-colors"
              >
                <span className="text-[#4B5563]">{field.title}:</span>
                {func === 'none' ? (
                  <span className="text-[#4B5563]">—</span>
                ) : (
                  <>
                    <span className="text-[#6B7280] uppercase text-[10px]">{func}</span>
                    <span className="text-[#F5F5F5] font-mono text-[11px]">{val}</span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-[#6B7280] font-mono">
          {search
            ? `${filteredRows.length} filtered · ${pageInfo.totalRows.toLocaleString()} total`
            : `${((page - 1) * 50 + 1).toLocaleString()}–${Math.min(page * 50, pageInfo.totalRows).toLocaleString()} of ${pageInfo.totalRows.toLocaleString()}`}
        </p>
        <div className="flex items-center gap-2">
          {loadingPage && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6B7280]" />}
          <button
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1 || loadingPage}
            className="p-1.5 rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#A0A0A0] font-mono min-w-[60px] text-center">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages || loadingPage}
            className="p-1.5 rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Cell Display ──────────────────────────────────────────────────────────────

function CellDisplay({ value, field }: { value: unknown; field: NocoField }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-[#2A2A2A]">—</span>
  }

  if (field.uidt === 'Checkbox') {
    return (
      <span className={`text-sm ${value ? 'text-[#22C55E]' : 'text-[#4B5563]'}`}>
        {value ? '✓' : '○'}
      </span>
    )
  }

  if (field.uidt === 'URL' && typeof value === 'string') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-xs text-[#3B82F6] hover:underline truncate font-mono"
      >
        {value}
      </a>
    )
  }

  if (field.uidt === 'Email' && typeof value === 'string') {
    return (
      <a
        href={`mailto:${value}`}
        onClick={e => e.stopPropagation()}
        className="text-xs text-[#3B82F6] hover:underline font-mono"
      >
        {value}
      </a>
    )
  }

  if (field.uidt === 'SingleSelect') {
    const opts = field.colOptions?.options ?? []
    const opt = opts.find(o => o.title === String(value))
    return (
      <span
        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
        style={{
          background: opt?.color ? `${opt.color}22` : 'rgba(255,255,255,0.06)',
          color: opt?.color ?? '#A0A0A0',
          border: `1px solid ${opt?.color ? `${opt.color}44` : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {String(value)}
      </span>
    )
  }

  if (field.uidt === 'MultiSelect') {
    const raw = Array.isArray(value) ? value : String(value).split(',')
    const opts = field.colOptions?.options ?? []
    return (
      <div className="flex flex-wrap gap-1">
        {raw.map((v, i) => {
          const label = typeof v === 'object' && v !== null ? (v as { title?: string }).title ?? JSON.stringify(v) : String(v).trim()
          const opt = opts.find(o => o.title === label)
          return (
            <span
              key={i}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{
                background: opt?.color ? `${opt.color}22` : 'rgba(255,255,255,0.06)',
                color: opt?.color ?? '#A0A0A0',
              }}
            >
              {label}
            </span>
          )
        })}
      </div>
    )
  }

  if (NUMERIC_UIDTS.has(field.uidt)) {
    return <span className="text-xs font-mono text-[#F5F5F5]">{String(value)}</span>
  }

  if (field.uidt === 'ID' || field.uidt === 'AutoNumber') {
    return <span className="text-xs font-mono text-[#6B7280]">{String(value)}</span>
  }

  if (field.uidt === 'LongText') {
    return (
      <span className="text-xs text-[#A0A0A0] line-clamp-2 whitespace-pre-wrap">
        {String(value)}
      </span>
    )
  }

  return <span className="text-xs text-[#F5F5F5] truncate">{String(value)}</span>
}

// ── Cell Editor ───────────────────────────────────────────────────────────────

function CellEditor({
  field,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  inputRef,
}: {
  field: NocoField
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  inputRef: React.RefObject<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>
}) {
  const baseClasses =
    'w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.16)] text-[#F5F5F5] text-xs outline-none px-3 py-2'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave() }
    if (e.key === 'Escape') onCancel()
  }

  if (field.uidt === 'LongText') {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onSave}
        onKeyDown={handleKeyDown}
        rows={3}
        className={`${baseClasses} resize-none`}
        disabled={saving}
      />
    )
  }

  if (field.uidt === 'SingleSelect') {
    const opts = field.colOptions?.options ?? []
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={value}
        onChange={e => { onChange(e.target.value); onSave() }}
        onBlur={onSave}
        className={`${baseClasses} appearance-none cursor-pointer`}
        disabled={saving}
      >
        <option value="">— none —</option>
        {opts.map(o => (
          <option key={o.id} value={o.title}>{o.title}</option>
        ))}
      </select>
    )
  }

  const inputType =
    field.uidt === 'Email' ? 'email' :
    field.uidt === 'URL' ? 'url' :
    field.uidt === 'PhoneNumber' ? 'tel' :
    NUMERIC_UIDTS.has(field.uidt) ? 'number' :
    DATE_UIDTS.has(field.uidt) ? 'date' :
    'text'

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={inputType}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onSave}
      onKeyDown={handleKeyDown}
      className={`${baseClasses} font-mono`}
      disabled={saving}
    />
  )
}
