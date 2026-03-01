'use client'
import { useState, useMemo } from 'react'
import { Plus, Trash2, ArrowLeft, X, Check, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { type WorkspaceId, type BaseColumn } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

export function BaseDetailClient({ base, initialRows, workspaceId }: BaseDetailClientProps) {
  const schema = (base.schema ?? []) as BaseColumn[]
  const [columns, setColumns] = useState<BaseColumn[]>(schema)
  const [rows, setRows] = useState<BaseRow[]>(initialRows)
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [filterCol, setFilterCol] = useState<string | null>(null)
  const [filterVal, setFilterVal] = useState('')
  const [showAddCol, setShowAddCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState<BaseColumn['type']>('text')
  const [savingCol, setSavingCol] = useState(false)

  const COLUMN_TYPES: Array<{ value: BaseColumn['type']; label: string }> = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'url', label: 'URL' },
    { value: 'email', label: 'Email' },
  ]

  const sortedFiltered = useMemo(() => {
    let data = [...rows]
    if (filterCol && filterVal) {
      data = data.filter(r => {
        const v = r.data[filterCol]
        return String(v ?? '').toLowerCase().includes(filterVal.toLowerCase())
      })
    }
    if (sortCol) {
      data.sort((a, b) => {
        const av = a.data[sortCol] ?? ''
        const bv = b.data[sortCol] ?? ''
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return data
  }, [rows, sortCol, sortDir, filterCol, filterVal])

  function handleSortClick(colName: string) {
    if (sortCol === colName) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(colName)
      setSortDir('asc')
    }
  }

  async function addRow() {
    const emptyData = Object.fromEntries(columns.map(c => [c.name, c.type === 'checkbox' ? false : '']))
    const res = await fetch(`/api/bases/${base.id}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: emptyData }),
    })
    if (res.ok) {
      const row = await res.json() as BaseRow
      setRows(prev => [...prev, row])
    } else {
      toast.error('Failed to add row')
    }
  }

  async function deleteRow(rowId: string) {
    const res = await fetch(`/api/bases/${base.id}/rows/${rowId}`, { method: 'DELETE' })
    if (res.ok) {
      setRows(prev => prev.filter(r => r.id !== rowId))
    } else {
      toast.error('Failed to delete row')
    }
  }

  function startEdit(rowId: string, col: string, currentValue: unknown) {
    setEditingCell({ rowId, col })
    setEditValue(currentValue == null ? '' : String(currentValue))
  }

  async function saveEdit() {
    if (!editingCell) return
    const { rowId, col } = editingCell

    const row = rows.find(r => r.id === rowId)
    if (!row) return

    const colDef = columns.find(c => c.name === col)
    let parsedVal: unknown = editValue
    if (colDef?.type === 'number') parsedVal = editValue ? Number(editValue) : null
    if (colDef?.type === 'checkbox') parsedVal = editValue === 'true'

    const newData = { ...row.data, [col]: parsedVal }

    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r))
    setEditingCell(null)

    const res = await fetch(`/api/bases/${base.id}/rows/${rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newData }),
    })
    if (!res.ok) {
      toast.error('Failed to save cell')
    }
  }

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

  function renderCell(row: BaseRow, col: BaseColumn) {
    const val = row.data[col.name]
    const isEditing = editingCell?.rowId === row.id && editingCell?.col === col.name

    if (isEditing) {
      if (col.type === 'checkbox') {
        return (
          <div className="flex items-center gap-2 px-2">
            <input type="checkbox" checked={editValue === 'true'}
              onChange={e => setEditValue(e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 accent-[#3B82F6]" />
            <button onClick={saveEdit} className="p-1 text-[#22C55E]"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditingCell(null)} className="p-1 text-[#6B7280]"><X className="w-3.5 h-3.5" /></button>
          </div>
        )
      }
      return (
        <div className="flex items-center gap-1 px-1">
          <input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null) }}
            autoFocus
            className="flex-1 px-2 py-1 rounded bg-[#0A0A0A] border border-[rgba(255,255,255,0.16)] text-[#F5F5F5] text-xs outline-none min-w-0"
          />
          <button onClick={saveEdit} className="p-1 text-[#22C55E] shrink-0"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditingCell(null)} className="p-1 text-[#6B7280] shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )
    }

    if (col.type === 'checkbox') {
      return (
        <div className="px-3 cursor-pointer" onClick={() => startEdit(row.id, col.name, val)}>
          <input type="checkbox" checked={!!val} readOnly className="w-4 h-4 accent-[#3B82F6] pointer-events-none" />
        </div>
      )
    }

    return (
      <div
        className="px-3 py-2 text-xs text-[#F5F5F5] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] transition-colors truncate min-w-[80px]"
        onClick={() => startEdit(row.id, col.name, val)}
      >
        {val == null || val === '' ? <span className="text-[#4B5563]">—</span> : String(val)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/bases?workspace=${workspaceId}`} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{base.name}</h1>
          {base.description && <p className="text-xs text-[#6B7280] mt-0.5">{base.description}</p>}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
          <span className="font-mono">{rows.length} rows</span>
          <span>·</span>
          <span className="font-mono">{columns.length} cols</span>
        </div>
      </div>

      {/* Filter bar */}
      {columns.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <select
            value={filterCol ?? ''}
            onChange={e => setFilterCol(e.target.value || null)}
            className="px-2.5 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-xs outline-none appearance-none"
          >
            <option value="">Filter by column...</option>
            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          {filterCol && (
            <input
              value={filterVal}
              onChange={e => setFilterVal(e.target.value)}
              placeholder="Filter value..."
              className="px-2.5 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-xs outline-none focus:border-[rgba(255,255,255,0.16)]"
            />
          )}
        </div>
      )}

      {/* Spreadsheet table */}
      <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              {columns.map(col => (
                <th key={col.name} className="text-left border-r border-[rgba(255,255,255,0.04)] last:border-r-0 group">
                  <div className="flex items-center gap-1 px-3 py-2.5">
                    <button
                      onClick={() => handleSortClick(col.name)}
                      className="flex items-center gap-1 text-xs font-medium text-[#6B7280] uppercase tracking-wide hover:text-[#A0A0A0] transition-colors"
                    >
                      {col.name}
                      <span className="text-[#4B5563]">
                        {sortCol === col.name ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                      </span>
                    </button>
                    <span className="text-[#4B5563] text-xs ml-1">{col.type}</span>
                    <button
                      onClick={() => deleteColumn(col.name)}
                      className="ml-auto p-0.5 text-[#4B5563] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-10 border-r border-[rgba(255,255,255,0.04)] last:border-r-0">
                {showAddCol ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      value={newColName}
                      onChange={e => setNewColName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addColumn() }}
                      placeholder="Name"
                      autoFocus
                      className="w-24 px-1.5 py-1 rounded bg-[#0A0A0A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs outline-none"
                    />
                    <select
                      value={newColType}
                      onChange={e => setNewColType(e.target.value as BaseColumn['type'])}
                      className="px-1.5 py-1 rounded bg-[#0A0A0A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs outline-none appearance-none"
                    >
                      {COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button onClick={addColumn} disabled={savingCol} className="p-1 text-[#22C55E]"><Check className="w-3 h-3" /></button>
                    <button onClick={() => setShowAddCol(false)} className="p-1 text-[#6B7280]"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddCol(true)}
                    className="w-full h-full flex items-center justify-center px-3 py-2.5 text-[#4B5563] hover:text-[#A0A0A0] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {sortedFiltered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-12 text-center text-sm text-[#4B5563]">
                  No rows yet. Click below to add one.
                </td>
              </tr>
            ) : sortedFiltered.map((row, rowIdx) => (
              <tr key={row.id} className={cn('border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] group', rowIdx % 2 === 0 ? '' : '')}>
                {columns.map(col => (
                  <td key={col.name} className="border-r border-[rgba(255,255,255,0.04)] last:border-r-0 p-0">
                    {renderCell(row, col)}
                  </td>
                ))}
                <td className="border-r border-[rgba(255,255,255,0.04)] w-10" />
                <td className="w-10 p-0">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="w-full h-full flex items-center justify-center p-2 text-[#4B5563] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addRow}
        className="mt-3 flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#A0A0A0] transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add row
      </button>
    </div>
  )
}
