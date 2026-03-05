'use client'

import { useEffect, useState, use } from 'react'
import { Table2, Database } from 'lucide-react'

type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'url' | 'email'

interface SharedColumn {
  id: string
  name: string
  columnType: ColumnType
  options: { choices?: string[] } | null
  order: number
}

interface SharedRow {
  id: string
  data: Record<string, unknown>
  createdAt: string
}

interface SharedTable {
  id: string
  name: string
  columns: SharedColumn[]
  rows: SharedRow[]
}

interface SharedBase {
  id: string
  name: string
  description: string | null
  tables: SharedTable[]
}

function CellValue({ value, columnType, options }: { value: unknown; columnType: ColumnType; options: { choices?: string[] } | null }) {
  if (value === null || value === undefined || value === '') return <span className="text-[#4B5563]">—</span>

  if (columnType === 'boolean') {
    return value ? (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-[3px] bg-[rgba(34,197,94,0.15)] text-[#22C55E] text-xs">✓</span>
    ) : (
      <span className="text-[#4B5563]">—</span>
    )
  }

  if (columnType === 'date') {
    try {
      const d = new Date(String(value))
      return <span className="text-[#A0A0A0] text-xs">{d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
    } catch { return <span className="text-[#A0A0A0] text-xs">{String(value)}</span> }
  }

  if (columnType === 'select') {
    const choices = options?.choices ?? []
    const idx = choices.indexOf(String(value))
    const colors = ['#F4A261', '#2A9D8F', '#D4A017', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981']
    const color = idx >= 0 ? colors[idx % colors.length] : '#6B7280'
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${color}22`, color }}>
        {String(value)}
      </span>
    )
  }

  if (columnType === 'url') {
    return <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-[#3B82F6] underline text-xs truncate max-w-[160px] block">{String(value)}</a>
  }

  if (columnType === 'number') {
    return <span className="text-[#A0A0A0] font-mono text-xs">{Number(value).toLocaleString()}</span>
  }

  return <span className="text-[#F5F5F5] text-xs">{String(value)}</span>
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [base, setBase] = useState<SharedBase | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTable, setActiveTable] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/tables/bases/share/${token}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error)))
      .then((data: SharedBase) => {
        setBase(data)
        if (data.tables[0]) setActiveTable(data.tables[0].id)
        setLoading(false)
      })
      .catch((e: string) => { setError(e ?? 'Not found'); setLoading(false) })
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-[#6B7280] text-sm">Loading…</div>
    </div>
  )

  if (error || !base) return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center">
        <Database className="w-10 h-10 text-[#4B5563] mx-auto mb-3" />
        <p className="text-[#6B7280] text-sm">{error ?? 'Base not found or not shared publicly.'}</p>
      </div>
    </div>
  )

  const currentTable = base.tables.find(t => t.id === activeTable) ?? base.tables[0]
  const sortedColumns = [...(currentTable?.columns ?? [])].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5]">
      {/* Header */}
      <div className="border-b border-[rgba(255,255,255,0.06)] px-6 py-4 flex items-center gap-3">
        <Table2 className="w-5 h-5 text-[#F4A261]" />
        <div>
          <h1 className="text-base font-semibold">{base.name}</h1>
          {base.description && <p className="text-xs text-[#6B7280]">{base.description}</p>}
        </div>
        <span className="ml-auto text-xs text-[#4B5563] bg-[#141414] border border-[rgba(255,255,255,0.06)] px-2 py-1 rounded">Read only</span>
      </div>

      {/* Table tabs */}
      {base.tables.length > 1 && (
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-[rgba(255,255,255,0.06)]">
          {base.tables.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTable(t.id)}
              className={`px-3 py-1.5 text-sm rounded-t-[4px] transition-colors ${
                activeTable === t.id
                  ? 'text-[#F5F5F5] bg-[#141414] border border-b-0 border-[rgba(255,255,255,0.08)]'
                  : 'text-[#6B7280] hover:text-[#A0A0A0]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto p-6">
        {!currentTable || currentTable.columns.length === 0 ? (
          <div className="py-16 text-center text-[#4B5563] text-sm">No data</div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                {sortedColumns.map(col => (
                  <th key={col.id} className="px-3 py-2 text-xs font-medium text-[#6B7280] uppercase tracking-wide whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentTable.rows.length === 0 ? (
                <tr><td colSpan={sortedColumns.length} className="px-3 py-8 text-center text-[#4B5563] text-sm">No rows</td></tr>
              ) : currentTable.rows.map(row => (
                <tr key={row.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.01)]">
                  {sortedColumns.map(col => (
                    <td key={col.id} className="px-3 py-2 max-w-[200px]">
                      <CellValue value={row.data[col.id]} columnType={col.columnType} options={col.options} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 right-4 text-xs text-[#4B5563]">
        Shared via OPS Dashboard
      </div>
    </div>
  )
}
