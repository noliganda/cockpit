'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Plus, ArrowLeft, X, Check, Download, Search, Table2, LayoutGrid, BarChart2 } from 'lucide-react'
import Link from 'next/link'
import { type WorkspaceId, type BaseColumn } from '@/types'
import { toast } from 'sonner'
import 'react-datasheet-grid/dist/style.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface BaseRow {
  id: string
  baseId: string
  data: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

interface BaseRecord {
  id: string
  workspaceId: string
  name: string
  description: string | null
  schema: unknown
  createdAt: Date
  updatedAt: Date
}

interface BaseDetailClientProps {
  base: BaseRecord
  initialRows: BaseRow[]
  workspaceId: WorkspaceId
}

type GridRow = Record<string, unknown>
type ViewMode = 'table' | 'cards' | 'stats'
type AggFunc = 'none' | 'count' | 'sum' | 'avg' | 'min' | 'max'

const COLUMN_TYPES: Array<{ value: BaseColumn['type']; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
]

// ── DSG lazy loader ───────────────────────────────────────────────────────────
let DSGModule: typeof import('react-datasheet-grid') | null = null
async function loadDSG() {
  if (!DSGModule) DSGModule = await import('react-datasheet-grid')
  return DSGModule
}

function buildDSGColumns(cols: BaseColumn[], dsg: typeof import('react-datasheet-grid')) {
  const { keyColumn, textColumn, checkboxColumn, floatColumn, isoDateColumn } = dsg
  return cols.map(col => {
    let inner: any
    switch (col.type) {
      case 'number': inner = floatColumn; break
      case 'checkbox': inner = checkboxColumn; break
      case 'date': inner = isoDateColumn; break
      default: inner = textColumn
    }
    return keyColumn(col.name, { ...inner, title: col.name, minWidth: 140 }) as any
  })
}

// ── Aggregation helpers ───────────────────────────────────────────────────────
const NUM_FUNCS: AggFunc[] = ['none', 'sum', 'avg', 'min', 'max', 'count']
const BOOL_FUNCS: AggFunc[] = ['none', 'count', 'sum', 'avg']
const TEXT_FUNCS: AggFunc[] = ['none', 'count']

function availableFuncs(type: BaseColumn['type']): AggFunc[] {
  if (type === 'number') return NUM_FUNCS
  if (type === 'checkbox') return BOOL_FUNCS
  return TEXT_FUNCS
}

function computeAgg(data: GridRow[], colName: string, colType: BaseColumn['type'], func: AggFunc): string {
  if (func === 'none') return ''
  const vals = data.map(r => r[colName])

  if (func === 'count') {
    return String(vals.filter(v => v !== undefined && v !== null && v !== '' && v !== false).length)
  }

  if (colType === 'checkbox') {
    const checked = vals.filter(v => v === true).length
    if (func === 'sum') return String(checked)
    if (func === 'avg') return data.length > 0 ? (checked / data.length * 100).toFixed(0) + '%' : '0%'
    return ''
  }

  const nums = vals.map(v => parseFloat(String(v))).filter(n => !isNaN(n))
  if (nums.length === 0) return '—'
  const sum = nums.reduce((a, b) => a + b, 0)
  switch (func) {
    case 'sum': return sum.toLocaleString()
    case 'avg': return (sum / nums.length).toLocaleString(undefined, { maximumFractionDigits: 2 })
    case 'min': return Math.min(...nums).toLocaleString()
    case 'max': return Math.max(...nums).toLocaleString()
    default: return ''
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export function BaseDetailClient({ base, initialRows, workspaceId }: BaseDetailClientProps) {
  const schema = (base.schema ?? []) as BaseColumn[]
  const [columns, setColumns] = useState<BaseColumn[]>(schema)
  const [rows, setRows] = useState<BaseRow[]>(initialRows)
  const [gridData, setGridData] = useState<GridRow[]>(initialRows.map(r => r.data))
  const [showAddCol, setShowAddCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<BaseColumn['type']>('text')
  const [savingCol, setSavingCol] = useState(false)
  const [GridComponent, setGridComponent] = useState<React.ComponentType<any> | null>(null)
  const [dsg, setDsg] = useState<typeof import('react-datasheet-grid') | null>(null)
  const [dsgCols, setDsgCols] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [search, setSearch] = useState('')
  const [aggFuncs, setAggFuncs] = useState<Record<string, AggFunc>>({})

  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Load DSG on client
  useEffect(() => {
    loadDSG().then(mod => {
      setDsg(mod)
      setGridComponent(() => mod.DataSheetGrid)
      setDsgCols(buildDSGColumns(schema, mod))
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dsg) setDsgCols(buildDSGColumns(columns, dsg))
  }, [columns, dsg])

  // Filtered data
  const filteredData = useMemo(() => {
    if (!search.trim()) return gridData
    const q = search.toLowerCase()
    return gridData.filter(row => Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q)))
  }, [gridData, search])

  // ── Row save debounce ────────────────────────────────────────────────────────
  function debouncedSave(rowId: string, data: GridRow) {
    clearTimeout(saveTimers.current[rowId])
    saveTimers.current[rowId] = setTimeout(async () => {
      const res = await fetch(`/api/bases/${base.id}/rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) toast.error('Failed to save')
    }, 500)
  }

  const handleChange = useCallback(async (
    newData: GridRow[],
    ops: Array<{ type: string; fromRowIndex: number; toRowIndex: number }>
  ) => {
    const currentRows = rowsRef.current
    for (const op of ops) {
      if (op.type === 'UPDATE') {
        for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
          const row = currentRows[i]
          if (row && newData[i] !== undefined) debouncedSave(row.id, newData[i])
        }
        setRows(prev => prev.map((r, i) => newData[i] !== undefined ? { ...r, data: newData[i] } : r))
        setGridData(newData)
      }
      if (op.type === 'CREATE') {
        setGridData(newData)
        for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
          const emptyData = newData[i] ?? Object.fromEntries(columns.map(c => [c.name, c.type === 'checkbox' ? false : '']))
          const res = await fetch(`/api/bases/${base.id}/rows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: emptyData }),
          })
          if (res.ok) {
            const newRow = await res.json() as BaseRow
            setRows(prev => { const u = [...prev]; u.splice(i, 0, newRow); return u })
          } else toast.error('Failed to create row')
        }
      }
      if (op.type === 'DELETE') {
        const toDelete = currentRows.slice(op.fromRowIndex, op.toRowIndex)
        setRows(prev => prev.filter((_, i) => i < op.fromRowIndex || i >= op.toRowIndex))
        setGridData(newData)
        for (const row of toDelete) {
          const res = await fetch(`/api/bases/${base.id}/rows/${row.id}`, { method: 'DELETE' })
          if (!res.ok) toast.error('Failed to delete row')
        }
      }
    }
  }, [base.id, columns])

  const createRow = useCallback(() =>
    Object.fromEntries(columns.map(c => [c.name, c.type === 'checkbox' ? false : ''])) as GridRow
  , [columns])

  // ── Column management ────────────────────────────────────────────────────────
  async function addColumn() {
    if (!newColName.trim()) return
    setSavingCol(true)
    const newCol: BaseColumn = { name: newColName.trim(), type: newColType }
    const updatedSchema = [...columns, newCol]
    const res = await fetch(`/api/bases/${base.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: updatedSchema }),
    })
    if (res.ok) {
      setColumns(updatedSchema)
      setNewColName(''); setShowAddCol(false)
      toast.success('Column added')
    } else toast.error('Failed to add column')
    setSavingCol(false)
  }

  async function deleteColumn(colName: string) {
    if (!confirm(`Delete column "${colName}"? This column's data will be lost.`)) return
    const updatedSchema = columns.filter(c => c.name !== colName)
    const res = await fetch(`/api/bases/${base.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: updatedSchema }),
    })
    if (res.ok) { setColumns(updatedSchema); toast.success('Column deleted') }
    else toast.error('Failed to delete column')
  }

  // ── Exports ──────────────────────────────────────────────────────────────────
  function exportCSV() {
    if (columns.length === 0) { toast.error('No columns'); return }
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = columns.map(c => esc(c.name)).join(',')
    const body = gridData.map(row => columns.map(c => esc(row[c.name])).join(',')).join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${base.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  function exportMarkdown() {
    if (columns.length === 0) { toast.error('No columns'); return }
    const header = `| ${columns.map(c => c.name).join(' | ')} |`
    const sep = `| ${columns.map(() => '---').join(' | ')} |`
    const body = gridData.map(row => `| ${columns.map(c => String(row[c.name] ?? '')).join(' | ')} |`)
    const md = [header, sep, ...body].join('\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${base.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
  }

  // ── Aggregation footer ───────────────────────────────────────────────────────
  function cycleAgg(colName: string, colType: BaseColumn['type']) {
    const funcs = availableFuncs(colType)
    const cur = aggFuncs[colName] ?? 'none'
    const next = funcs[(funcs.indexOf(cur) + 1) % funcs.length]
    setAggFuncs(prev => ({ ...prev, [colName]: next }))
  }

  // ── Stats view helpers ───────────────────────────────────────────────────────
  function colStats(col: BaseColumn) {
    const vals = gridData.map(r => r[col.name])
    const nonEmpty = vals.filter(v => v !== undefined && v !== null && v !== '' && v !== false)
    const stats: { label: string; value: string }[] = [
      { label: 'Total', value: String(gridData.length) },
      { label: 'Non-empty', value: String(nonEmpty.length) },
      { label: 'Empty', value: String(gridData.length - nonEmpty.length) },
    ]
    if (col.type === 'number') {
      const nums = vals.map(v => parseFloat(String(v))).filter(n => !isNaN(n))
      if (nums.length > 0) {
        const sum = nums.reduce((a, b) => a + b, 0)
        stats.push(
          { label: 'Sum', value: sum.toLocaleString() },
          { label: 'Avg', value: (sum / nums.length).toLocaleString(undefined, { maximumFractionDigits: 2 }) },
          { label: 'Min', value: Math.min(...nums).toLocaleString() },
          { label: 'Max', value: Math.max(...nums).toLocaleString() },
        )
      }
    }
    if (col.type === 'checkbox') {
      const checked = vals.filter(v => v === true).length
      stats.push(
        { label: 'Checked', value: String(checked) },
        { label: '% checked', value: gridData.length > 0 ? (checked / gridData.length * 100).toFixed(0) + '%' : '0%' },
      )
    }
    return stats
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const viewIcons = [
    { mode: 'table' as ViewMode, Icon: Table2, label: 'Table' },
    { mode: 'cards' as ViewMode, Icon: LayoutGrid, label: 'Cards' },
    { mode: 'stats' as ViewMode, Icon: BarChart2, label: 'Stats' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-full">

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/bases?workspace=${workspaceId}`} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{base.name}</h1>
          {base.description && <p className="text-xs text-[#6B7280] mt-0.5">{base.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] font-mono">{rows.length} rows · {columns.length} cols</span>

          {/* View toggle */}
          <div className="flex items-center rounded-[6px] border border-[rgba(255,255,255,0.08)] overflow-hidden">
            {viewIcons.map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className={`px-2.5 py-1.5 transition-colors ${viewMode === mode ? 'bg-[#222222] text-[#F5F5F5]' : 'text-[#6B7280] hover:text-[#A0A0A0]'}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {/* Exports */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            MD
          </button>
        </div>
      </div>

      {/* Toolbar: search + column chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#4B5563]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter rows…"
            className="pl-6 pr-7 py-1.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.16)] w-36"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#F5F5F5]">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="w-px h-4 bg-[rgba(255,255,255,0.06)]" />

        {columns.map(col => (
          <div key={col.name} className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-xs text-[#A0A0A0]">
            <span>{col.name}</span>
            <span className="text-[#4B5563]">({col.type})</span>
            <button onClick={() => deleteColumn(col.name)} className="ml-1 text-[#4B5563] hover:text-[#EF4444] transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}

        {showAddCol ? (
          <div className="flex items-center gap-1.5">
            <input
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addColumn() }}
              placeholder="Column name"
              autoFocus
              className="px-2 py-1 rounded-[4px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs outline-none w-28"
            />
            <select
              value={newColType}
              onChange={e => setNewColType(e.target.value as BaseColumn['type'])}
              className="px-1.5 py-1 rounded-[4px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs outline-none appearance-none"
            >
              {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={addColumn} disabled={savingCol} className="p-1 text-[#22C55E]"><Check className="w-3 h-3" /></button>
            <button onClick={() => setShowAddCol(false)} className="p-1 text-[#6B7280]"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCol(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-[4px] border border-dashed border-[rgba(255,255,255,0.12)] text-xs text-[#6B7280] hover:text-[#A0A0A0] hover:border-[rgba(255,255,255,0.20)] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add column
          </button>
        )}
      </div>

      {/* Content */}
      {columns.length === 0 ? (
        <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-12 text-center">
          <p className="text-sm text-[#4B5563]">No columns yet. Add a column above to get started.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* ── Table / Spreadsheet view ── */
        <>
          {!GridComponent ? (
            <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-8 text-center">
              <p className="text-sm text-[#4B5563]">Loading grid…</p>
            </div>
          ) : (
            <div
              className="rounded-[8px] overflow-hidden border border-[rgba(255,255,255,0.06)]"
              style={{
                '--dsg-cell-background-color': '#141414',
                '--dsg-cell-disabled-background-color': '#0F0F0F',
                '--dsg-header-text-color': '#6B7280',
                '--dsg-cell-text-color': '#F5F5F5',
                '--dsg-selection-border-color': '#3B82F6',
                '--dsg-selection-background-color': 'rgba(59,130,246,0.08)',
                '--dsg-border-color': 'rgba(255,255,255,0.06)',
                '--dsg-header-active-background-color': 'rgba(255,255,255,0.04)',
                '--dsg-expand-rows-icon-color': '#6B7280',
              } as React.CSSProperties}
            >
              <GridComponent
                value={filteredData}
                onChange={search ? undefined : handleChange}
                columns={dsgCols}
                createRow={createRow}
                duplicateRow={({ rowData }: { rowData: GridRow }) => ({ ...rowData })}
                height={Math.min(600, Math.max(200, filteredData.length * 36 + 80))}
                lockRows={!!search}
              />
            </div>
          )}

          {/* Aggregation footer */}
          {gridData.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs text-[#4B5563] shrink-0 font-mono">Σ</span>
              {columns.map(col => {
                const funcs = availableFuncs(col.type)
                if (funcs.length <= 1) return null
                const func = aggFuncs[col.name] ?? 'none'
                const value = computeAgg(gridData, col.name, col.type, func)
                return (
                  <button
                    key={col.name}
                    onClick={() => cycleAgg(col.name, col.type)}
                    title={`Click to cycle: ${funcs.join(' → ')}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-[4px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-xs hover:bg-[rgba(255,255,255,0.07)] transition-colors shrink-0"
                  >
                    <span className="text-[#4B5563]">{col.name}:</span>
                    {func === 'none' ? (
                      <span className="text-[#4B5563]">—</span>
                    ) : (
                      <>
                        <span className="text-[#6B7280] uppercase text-[10px]">{func}</span>
                        <span className="text-[#F5F5F5] font-mono">{value}</span>
                      </>
                    )}
                  </button>
                )
              })}
              {search && (
                <span className="text-xs text-[#6B7280] ml-2 shrink-0">(showing {filteredData.length} of {gridData.length})</span>
              )}
            </div>
          )}
        </>
      ) : viewMode === 'cards' ? (
        /* ── Cards view ── */
        <div>
          {filteredData.length === 0 ? (
            <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-12 text-center">
              <p className="text-sm text-[#4B5563]">{search ? 'No rows match your filter.' : 'No rows yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredData.map((row, idx) => {
                const firstCol = columns[0]
                const title = firstCol ? String(row[firstCol.name] ?? '') : ''
                const rest = columns.slice(1)
                return (
                  <div key={idx} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] transition-colors">
                    <p className="text-sm font-semibold text-[#F5F5F5] mb-3 truncate">
                      {title || <span className="text-[#4B5563]">Row {idx + 1}</span>}
                    </p>
                    <div className="space-y-1.5">
                      {rest.map(col => (
                        <div key={col.name} className="flex items-start gap-2">
                          <span className="text-xs text-[#4B5563] w-24 shrink-0 truncate">{col.name}</span>
                          <span className="text-xs text-[#A0A0A0] truncate flex-1">
                            {col.type === 'checkbox' ? (row[col.name] ? '✓' : '—') : String(row[col.name] ?? '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {search && (
            <p className="mt-3 text-xs text-[#6B7280]">Showing {filteredData.length} of {gridData.length} rows</p>
          )}
        </div>
      ) : (
        /* ── Stats view ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map(col => (
            <div key={col.name} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[#F5F5F5]">{col.name}</p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#6B7280]">{col.type}</span>
              </div>
              <div className="space-y-1.5">
                {colStats(col).map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-[#6B7280]">{s.label}</span>
                    <span className="text-xs font-mono text-[#F5F5F5]">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
