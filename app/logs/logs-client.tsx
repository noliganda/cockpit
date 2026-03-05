'use client'
import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Sparkles, Filter, X } from 'lucide-react'
import { cn, getWorkspaceColor, formatRelativeDate } from '@/lib/utils'
import { WORKSPACES } from '@/types'
import { toast } from 'sonner'

interface LogEntry {
  id: string
  workspaceId: string
  actor: string
  action: string
  entityType: string
  entityId?: string | null
  entityTitle?: string | null
  description?: string | null
  metadata?: unknown
  hasEmbedding?: string | null
  createdAt: Date
}

interface LogsClientProps {
  entries: LogEntry[]
  entityTypes: string[]
  currentFilters: { q?: string; workspace?: string; type?: string; page?: number }
  hasMore: boolean
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  task: '#D4A017',
  project: '#22C55E',
  contact: '#3B82F6',
  note: '#A855F7',
  email: '#F97316',
  document: '#06B6D4',
  sprint: '#EC4899',
  area: '#6B7280',
  sync: '#14B8A6',
  organisation: '#8B5CF6',
}

const ACTOR_COLORS: Record<string, string> = {
  system: '#6B7280',
  charlie: '#D4A017',
  user: '#3B82F6',
}

export function LogsClient({ entries, entityTypes, currentFilters, hasMore }: LogsClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [q, setQ] = useState(currentFilters.q ?? '')
  const [workspace, setWorkspace] = useState(currentFilters.workspace ?? '')
  const [type, setType] = useState(currentFilters.type ?? '')
  const [vectorQuery, setVectorQuery] = useState('')
  const [vectorResults, setVectorResults] = useState<LogEntry[] | null>(null)
  const [vectorLoading, setVectorLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const page = currentFilters.page ?? 1

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams()
    const merged = { q, workspace, type, page, ...overrides }
    if (merged.q) params.set('q', merged.q.toString())
    if (merged.workspace) params.set('workspace', merged.workspace.toString())
    if (merged.type) params.set('type', merged.type.toString())
    if (merged.page && merged.page > 1) params.set('page', merged.page.toString())
    return `${pathname}?${params.toString()}`
  }

  const applyFilters = useCallback(() => {
    setVectorResults(null)
    router.push(buildUrl({ q, workspace, type, page: 1 }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, workspace, type])

  function clearFilters() {
    setQ(''); setWorkspace(''); setType(''); setVectorResults(null)
    router.push(pathname)
  }

  async function handleVectorSearch() {
    if (!vectorQuery.trim()) return
    setVectorLoading(true)
    try {
      const res = await fetch('/api/logs/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: vectorQuery, limit: 20 }),
      })
      if (res.ok) {
        const data = await res.json() as LogEntry[]
        setVectorResults(data)
      } else {
        const data = await res.json() as { error?: string }
        toast.error(data.error ?? 'Vector search failed')
      }
    } catch { toast.error('Search error') }
    finally { setVectorLoading(false) }
  }

  const hasActiveFilters = q || workspace || type

  const displayEntries = vectorResults ?? entries

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Activity Log</h1>
        <p className="text-sm text-[#6B7280] mt-1">Full history of all actions — tasks, emails, docs, syncs, everything.</p>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] mb-4 space-y-3">
        {/* Text search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4B5563]" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Search by title, action, description…"
              className="w-full pl-9 pr-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors"
            />
          </div>
          <select
            value={workspace}
            onChange={e => setWorkspace(e.target.value)}
            className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
          >
            <option value="">All workspaces</option>
            {WORKSPACES.map(w => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
          </select>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
          >
            <option value="">All types</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-sm text-[#F5F5F5] hover:bg-[#222222] transition-colors flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="px-3 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Vector / semantic search */}
        <div className="flex gap-2 pt-1 border-t border-[rgba(255,255,255,0.04)]">
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A855F7]" />
            <input
              type="text"
              value={vectorQuery}
              onChange={e => setVectorQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVectorSearch()}
              placeholder="Semantic search — e.g. 'emails about KORUS invoices'"
              className="w-full pl-9 pr-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(180,130,250,0.3)] transition-colors"
            />
          </div>
          <button
            onClick={handleVectorSearch}
            disabled={vectorLoading || !vectorQuery.trim()}
            className="px-4 py-2 rounded-[6px] bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.2)] text-sm text-[#A855F7] hover:bg-[rgba(168,85,247,0.18)] disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {vectorLoading ? 'Searching…' : 'Semantic'}
          </button>
          {vectorResults && (
            <button onClick={() => { setVectorResults(null); setVectorQuery('') }}
              className="px-3 py-2 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
              Clear
            </button>
          )}
        </div>
        {vectorResults && (
          <p className="text-xs text-[#A855F7]">
            Showing {vectorResults.length} semantic matches for &ldquo;{vectorQuery}&rdquo;
          </p>
        )}
      </div>

      {/* Log table */}
      <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {displayEntries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#4B5563]">No log entries found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-36">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-24">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-24">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Action + Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-24">Workspace</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map(entry => {
                    const wsColor = getWorkspaceColor(entry.workspaceId)
                    const typeColor = ENTITY_TYPE_COLORS[entry.entityType] ?? '#6B7280'
                    const actorColor = ACTOR_COLORS[entry.actor?.toLowerCase()] ?? '#A0A0A0'
                    const ws = WORKSPACES.find(w => w.id === entry.workspaceId)
                    const isExpanded = expandedId === entry.id

                    return (
                      <>
                        <tr
                          key={entry.id}
                          className={cn(
                            'border-b border-[rgba(255,255,255,0.04)] last:border-0 cursor-pointer transition-colors',
                            isExpanded ? 'bg-[rgba(255,255,255,0.03)]' : 'hover:bg-[rgba(255,255,255,0.02)]'
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <td className="px-4 py-3 text-xs text-[#6B7280] font-mono whitespace-nowrap">
                            <div>{formatRelativeDate(entry.createdAt)}</div>
                            <div className="text-[10px] text-[#4B5563] mt-0.5">
                              {new Date(entry.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium capitalize" style={{ color: actorColor }}>
                              {entry.actor}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                              style={{ color: typeColor, backgroundColor: `${typeColor}18` }}
                            >
                              {entry.entityType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xs text-[#6B7280]">{entry.action}</span>
                              {entry.entityTitle && (
                                <span className="text-sm text-[#F5F5F5] truncate max-w-xs">{entry.entityTitle}</span>
                              )}
                            </div>
                            {entry.description && !isExpanded && (
                              <p className="text-xs text-[#4B5563] truncate max-w-sm mt-0.5">{entry.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wsColor }} />
                              <span className="text-xs text-[#6B7280]">{ws?.name ?? entry.workspaceId}</span>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${entry.id}-detail`} className="border-b border-[rgba(255,255,255,0.04)]">
                            <td colSpan={5} className="px-4 py-3 bg-[rgba(255,255,255,0.02)]">
                              <div className="space-y-2 text-xs">
                                {entry.description && (
                                  <div>
                                    <span className="text-[#6B7280] uppercase tracking-wide">Description</span>
                                    <p className="text-[#A0A0A0] mt-0.5">{entry.description}</p>
                                  </div>
                                )}
                                {entry.entityId && (
                                  <div>
                                    <span className="text-[#6B7280] uppercase tracking-wide">Entity ID</span>
                                    <p className="text-[#4B5563] font-mono mt-0.5">{entry.entityId}</p>
                                  </div>
                                )}
                                {!!entry.metadata && (
                                  <div>
                                    <span className="text-[#6B7280] uppercase tracking-wide">Metadata</span>
                                    <pre className="text-[#4B5563] text-[10px] mt-0.5 overflow-x-auto bg-[#0A0A0A] rounded-[4px] p-2">
                                      {JSON.stringify(entry.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {entry.hasEmbedding && (
                                  <div className="flex items-center gap-1.5 text-[#A855F7]">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Vector embedding stored ({entry.hasEmbedding})</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!vectorResults && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280]">
                  {entries.length === 0 ? 'No results' : `Showing ${((page - 1) * 50) + 1}–${((page - 1) * 50) + entries.length}`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => router.push(buildUrl({ page: page - 1 }))}
                    className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-[#6B7280] font-mono">Page {page}</span>
                  <button
                    disabled={!hasMore}
                    onClick={() => router.push(buildUrl({ page: page + 1 }))}
                    className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
