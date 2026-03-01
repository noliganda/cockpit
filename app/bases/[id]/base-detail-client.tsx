'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, ArrowLeft, X, Check, Download } from 'lucide-react'
import Link from 'next/link'
import { type WorkspaceId, type BaseColumn } from '@/types'
import { toast } from 'sonner'
import 'react-datasheet-grid/dist/style.css'

// ── Types ────────────────────────────────────────────────────────────────────
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

const COLUMN_TYPES: Array<{ value: BaseColumn['type']; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
]

// ── DSG Wrapper ──────────────────────────────────────────────────────────────
// We lazy-load react-datasheet-grid to avoid SSR issues
let DSGModule: typeof import('react-datasheet-grid') | null = null

async function loadDSG() {
  if (!DSGModule) {
    DSGModule = await import('react-datasheet-grid')
  }
  return DSGModule
}

function buildColumns(cols: BaseColumn[], dsg: typeof import('react-datasheet-grid')) {
  const { keyColumn, textColumn, checkboxColumn, floatColumn, isoDateColumn } = dsg
  return cols.map(col => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let inner: any
    switch (col.type) {
      case 'number': inner = floatColumn; break
      case 'checkbox': inner = checkboxColumn; break
      case 'date': inner = isoDateColumn; break
      default: inner = textColumn
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return keyColumn(col.name, { ...inner, title: col.name, minWidth: 120 }) as any
  })
}

// ── Component ────────────────────────────────────────────────────────────────
export function BaseDetailClient({ base, initialRows, workspaceId }: BaseDetailClientProps) {
  const schema = (base.schema ?? []) as BaseColumn[]
  const [columns, setColumns] = useState<BaseColumn[]>(schema)
  const [rows, setRows] = useState<BaseRow[]>(initialRows)
  const [gridData, setGridData] = useState<GridRow[]>(initialRows.map(r => r.data))
  const [showAddCol, setShowAddCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<BaseColumn['type']>('text')
  const [savingCol, setSavingCol] = useState(false)
  const [dsg, setDsg] = useState<typeof import('react-datasheet-grid') | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dsgCols, setDsgCols] = useState<any[]>([])
  const [GridComponent, setGridComponent] = useState<React.ComponentType<any> | null>(null)

  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Load DataSheetGrid on client
  useEffect(() => {
    loadDSG().then(mod => {
      setDsg(mod)
      setGridComponent(() => mod.DataSheetGrid)
      setDsgCols(buildColumns(schema, mod))
    })
  }, [])

  // Rebuild DSG cols when columns change
  useEffect(() => {
    if (dsg) {
      setDsgCols(buildColumns(columns, dsg))
    }
  }, [columns, dsg])

  function debouncedSaveRow(rowId: string, data: GridRow) {
    if (saveTimers.current[rowId]) clearTimeout(saveTimers.current[rowId])
    saveTimers.current[rowId] = setTimeout(async () => {
      const res = await fetch(`/api/bases/${base.id}/rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      })
      if (!res.ok) toast.error('Failed to save cell')
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
          if (row && newData[i] !== undefined) {
            debouncedSaveRow(row.id, newData[i])
          }
        }
        setRows(prev => prev.map((r, i) => newData[i] !== undefined ? { ...r, data: newData[i] } : r))
        setGridData(newData)
      }

      if (op.type === 'CREATE') {
        setGridData(newData)
        const creates = []
        for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
          const emptyData = newData[i] ?? Object.fromEntries(columns.map(c => [c.name, c.type === 'checkbox' ? false : '']))
          creates.push({ index: i, data: emptyData })
        }
        for (const { index, data: rowData } of creates) {
          const res = await fetch(`/api/bases/${base.id}/rows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: rowData }),
          })
          if (res.ok) {
            const newRow = await res.json() as BaseRow
            setRows(prev => {
              const updated = [...prev]
              updated.splice(index, 0, newRow)
              return updated
            })
          } else {
            toast.error('Failed to create row')
          }
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

  const createRow = useCallback(() => {
    return Object.fromEntries(columns.map(c => [c.name, c.type === 'checkbox' ? false : ''])) as GridRow
  }, [columns])

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
    } else {
      toast.error('Failed to add column')
    }
    setSavingCol(false)
  }

  async function deleteColumn(colName: string) {
    if (!confirm(`Delete column "${colName}"? Data in this column will be lost.`)) return
    const updatedSchema = columns.filter(c => c.name !== colName)
    const res = await fetch(`/api/bases/${base.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema: updatedSchema }),
    })
    if (res.ok) {
      setColumns(updatedSchema)
      toast.success('Column deleted')
    } else {
      toast.error('Failed to delete column')
    }
  }

  function exportMarkdown() {
    if (columns.length === 0) { toast.error('No columns to export'); return }
    const header = `| ${columns.map(c => c.name).join(' | ')} |`
    const sep = `| ${columns.map(() => '---').join(' | ')} |`
    const bodyRows = gridData.map(row =>
      `| ${columns.map(c => String(row[c.name] ?? '')).join(' | ')} |`
    )
    const md = [header, sep, ...bodyRows].join('\n')
    const date = new Date().toISOString().slice(0, 10)
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `base-${base.name.toLowerCase().replace(/\s+/g, '-')}-${date}.md`
    a.click()
  }

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/bases?workspace=${workspaceId}`} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{base.name}</h1>
          {base.description && <p className="text-xs text-[#6B7280] mt-0.5">{base.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] font-mono">{rows.length} rows · {columns.length} cols</span>
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export MD
          </button>
        </div>
      </div>

      {/* Column management bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
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

      {/* Spreadsheet */}
      {columns.length === 0 ? (
        <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-12 text-center">
          <p className="text-sm text-[#4B5563]">No columns yet. Add a column above to get started.</p>
        </div>
      ) : !GridComponent ? (
        <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-8 text-center">
          <p className="text-sm text-[#4B5563]">Loading grid…</p>
        </div>
      ) : (
        <div
          className="rounded-[8px] overflow-hidden border border-[rgba(255,255,255,0.06)] dsg-dark"
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
            value={gridData}
            onChange={handleChange}
            columns={dsgCols}
            createRow={createRow}
            duplicateRow={({ rowData }: { rowData: GridRow }) => ({ ...rowData })}
            height={Math.min(600, Math.max(200, rows.length * 36 + 80))}
            rowClassName={() => 'dsg-row-dark'}
          />
        </div>
      )}
    </div>
  )
}
