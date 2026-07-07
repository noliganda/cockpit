'use client'
import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Filter, X, ExternalLink, DollarSign, Sparkles } from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { AGENTS } from '@/types'

interface LogEntry {
  id: string
  workspaceId?: string | null
  actor: string
  actorType: string
  actorId?: string | null
  actorName?: string | null
  agentId?: string | null
  action: string
  eventType?: string | null
  eventFamily?: string | null
  entityType: string
  entityTitle?: string | null
  entity?: string | null
  description?: string | null
  metadata?: unknown
  category?: string | null
  status: string
  sourceSystem: string
  sourceUrl?: string | null
  workflowRunId?: string | null
  apiModel?: string | null
  apiCostUsd?: number | null
  createdAt: Date
}

interface LogsClientProps {
  entries: LogEntry[]
  eventTypes: string[]
  agentIds: string[]
  actorTypes: string[]
  currentFilters: {
    q?: string
    entity?: string
    agent?: string
    type?: string
    actor_type?: string
    page?: number
  }
  hasMore: boolean
  isGuest?: boolean
  guestLabel?: string | null
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  // Agent event types (from agent_actions seed / backfill)
  email_sent: '#5F7A72',
  email_received: '#6E8B7E',
  task_updated: '#C99A1F',
  task_created: '#C9962E',
  task_deleted: '#C0452E',
  invoice_created: '#7D9B5E',
  invoice_checked: '#8FAF6E',
  expense_logged: '#C96F2E',
  outreach_call: '#4A8578',
  lead_qualified: '#4A8578',
  proposal_sent: '#9B6B4F',
  content_drafted: '#B0584A',
  research_completed: '#9B6B4F',
  code_deployed: '#5F7A72',
  code_committed: '#6E8B7E',
  morning_brief: '#C99A1F',
  system_maintenance: '#7A6F55',
  // CRUD event types (from Phase 2 writers)
  project_created: '#7D9B5E',
  project_updated: '#C99A1F',
  project_deleted: '#C0452E',
  area_created: '#7D9B5E',
  area_updated: '#C99A1F',
  area_deleted: '#C0452E',
  sprint_created: '#7D9B5E',
  sprint_updated: '#C99A1F',
  sprint_deleted: '#C0452E',
  contact_created: '#4A8578',
  contact_updated: '#C99A1F',
  contact_deleted: '#C0452E',
  organisation_created: '#4A8578',
  organisation_updated: '#C99A1F',
  organisation_deleted: '#C0452E',
  note_created: '#9B6B4F',
  note_updated: '#C99A1F',
  note_deleted: '#C0452E',
  notion_sync_completed: '#7A6F55',
  // Backfilled productivity actions
  reported_action: '#7A6F55',
}

const ACTOR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  agent:   { label: 'Agent',   color: '#C99A1F' },
  human:   { label: 'User',    color: '#5F7A72' },
  system:  { label: 'System',  color: '#7A6F55' },
  webhook: { label: 'Webhook', color: '#9B6B4F' },
}

export function LogsClient({ entries, eventTypes, agentIds, actorTypes, currentFilters, hasMore, isGuest, guestLabel }: LogsClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [q, setQ] = useState(currentFilters.q ?? '')
  const [entity, setEntity] = useState(currentFilters.entity ?? '')
  const [agent, setAgent] = useState(currentFilters.agent ?? '')
  const [type, setType] = useState(currentFilters.type ?? '')
  const [actorType, setActorType] = useState(currentFilters.actor_type ?? '')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Semantic search state
  const [semanticMode, setSemanticMode] = useState(false)
  const [semanticResults, setSemanticResults] = useState<LogEntry[] | null>(null)
  const [semanticLoading, setSemanticLoading] = useState(false)
  const [semanticError, setSemanticError] = useState<string | null>(null)

  const page = currentFilters.page ?? 1

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams()
    const merged = { q, entity, agent, type, actor_type: actorType, page, ...overrides }
    if (merged.q) params.set('q', merged.q.toString())
    if (merged.entity && !isGuest) params.set('entity', merged.entity.toString())
    if (merged.agent) params.set('agent', merged.agent.toString())
    if (merged.type) params.set('type', merged.type.toString())
    if (merged.actor_type) params.set('actor_type', merged.actor_type.toString())
    if (merged.page && merged.page > 1) params.set('page', merged.page.toString())
    return `${pathname}?${params.toString()}`
  }

  async function runSemanticSearch() {
    if (!q.trim()) return
    setSemanticLoading(true)
    setSemanticError(null)
    try {
      const res = await fetch('/api/logs/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 50 }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Search failed' })) as { error?: string }
        setSemanticError(data.error ?? 'Search failed')
        setSemanticResults(null)
        return
      }
      const rows = await res.json() as Array<Record<string, unknown>>
      // Map vector-search response to LogEntry shape
      setSemanticResults(rows.map(r => ({
        id: r.id as string,
        actor: (r.actor as string) ?? 'system',
        actorType: 'human',
        action: (r.action as string) ?? '',
        entityType: (r.entityType as string) ?? '',
        entityTitle: r.entityTitle as string | null,
        entity: null,
        description: r.description as string | null,
        metadata: r.metadata,
        status: 'success',
        sourceSystem: 'dashboard',
        workflowRunId: r.workflowRunId as string | null,
        apiModel: r.apiModel as string | null,
        apiCostUsd: null,
        createdAt: new Date(r.createdAt as string),
      })))
    } catch {
      setSemanticError('Network error')
      setSemanticResults(null)
    } finally {
      setSemanticLoading(false)
    }
  }

  const applyFilters = useCallback(() => {
    if (semanticMode) {
      runSemanticSearch()
    } else {
      setSemanticResults(null)
      router.push(buildUrl({ q, entity, agent, type, actor_type: actorType, page: 1 }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, entity, agent, type, actorType, semanticMode])

  function clearFilters() {
    setQ(''); setEntity(''); setAgent(''); setType(''); setActorType('')
    setSemanticResults(null); setSemanticError(null)
    router.push(pathname)
  }

  const hasActiveFilters = q || entity || agent || type || actorType || semanticResults

  // Use semantic results when available, otherwise server-rendered entries
  const displayEntries = semanticResults ?? entries

  // Calculate total cost for visible entries
  const totalCost = displayEntries.reduce((sum, e) => sum + (e.apiCostUsd ?? 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">
            {isGuest ? 'Activity Log' : 'Operational Log'}
          </h1>
          <p className="text-sm text-[#7A6F55] mt-1">
            {isGuest && guestLabel
              ? guestLabel
              : 'Unified operational events — agents, dashboard, syncs, and more.'}
          </p>
        </div>
        {!isGuest && totalCost > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[rgba(125,155,94,0.08)] border border-[rgba(125,155,94,0.15)]">
            <DollarSign className="w-3.5 h-3.5 text-[#7D9B5E]" />
            <span className="text-xs font-mono text-[#7D9B5E]">
              ${totalCost.toFixed(4)} this page
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5C5340]" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Search events…"
              className="w-full pl-9 pr-3 py-2 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] transition-colors"
            />
          </div>
          {!isGuest && (
            <select
              value={entity}
              onChange={e => setEntity(e.target.value)}
              className="px-3 py-2 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none appearance-none"
            >
              <option value="">All workspaces</option>
              <option value="byron-film">Byron Film</option>
              <option value="korus">KORUS Group</option>
              <option value="personal">Personal</option>
            </select>
          )}
          <select
            value={actorType}
            onChange={e => setActorType(e.target.value)}
            className="px-3 py-2 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none appearance-none"
          >
            <option value="">All actors</option>
            {actorTypes.map(at => (
              <option key={at} value={at}>
                {ACTOR_TYPE_LABELS[at]?.label ?? at}
              </option>
            ))}
          </select>
          <select
            value={agent}
            onChange={e => setAgent(e.target.value)}
            className="px-3 py-2 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none appearance-none"
          >
            <option value="">All agents</option>
            {agentIds.map(a => {
              const def = AGENTS.find(ag => ag.id === a)
              return <option key={a} value={a}>{def ? `${def.emoji} ${def.name}` : a}</option>
            })}
          </select>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="px-3 py-2 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none appearance-none"
          >
            <option value="">All event types</option>
            {eventTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            onClick={() => { setSemanticMode(!semanticMode); setSemanticResults(null); setSemanticError(null) }}
            className={cn(
              'px-3 py-2 rounded-none border text-sm flex items-center gap-1.5 transition-colors',
              semanticMode
                ? 'bg-[rgba(155,107,79,0.12)] border-[rgba(155,107,79,0.3)] text-[#9B6B4F]'
                : 'bg-[#281E16] border-[rgba(167,155,120,0.13)] text-[#7A6F55] hover:text-[#E8DFCE]'
            )}
            title={semanticMode ? 'Semantic search on — uses AI embeddings' : 'Switch to semantic search'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Semantic
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-none bg-[#281E16] border border-[rgba(167,155,120,0.22)] text-sm text-[#E8DFCE] hover:bg-[#2F241A] transition-colors flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            {semanticMode ? 'Search' : 'Filter'}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="px-3 py-2 rounded-none bg-[#281E16] border border-[rgba(167,155,120,0.13)] text-sm text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {semanticMode && (
          <p className="text-xs text-[#9B6B4F]">
            Semantic search mode — enter a natural language query and press Enter or Search.
            {semanticLoading && ' Searching...'}
            {semanticError && <span className="text-[#C0452E] ml-2">{semanticError}</span>}
            {semanticResults && !semanticLoading && ` Found ${semanticResults.length} results.`}
          </p>
        )}
      </div>

      {/* Log table */}
      <div className="rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] overflow-hidden">
        {displayEntries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#5C5340]">{semanticMode ? 'No semantic results — try a different query' : 'No events found'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(167,155,120,0.13)]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide w-36">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide w-28">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide w-36">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">Description</th>
                    {!isGuest && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide w-28">Workspace</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#7A6F55] uppercase tracking-wide w-20">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map(entry => {
                    const displayEventType = entry.eventType ?? entry.action
                    const typeColor = EVENT_TYPE_COLORS[displayEventType] ?? '#7A6F55'
                    const workspaceLabel = entry.workspaceId === 'byron-film' ? 'Byron Film' : entry.workspaceId === 'korus' ? 'KORUS Group' : entry.workspaceId === 'personal' ? 'Personal' : 'Shared'
                    const isExpanded = expandedId === entry.id
                    const cost = entry.apiCostUsd ?? 0

                    // Actor display
                    const agentDef = entry.agentId ? AGENTS.find(a => a.id === entry.agentId) : null
                    const actorLabel = agentDef?.name
                      ?? entry.actorName
                      ?? entry.actorId
                      ?? (ACTOR_TYPE_LABELS[entry.actorType]?.label ?? entry.actor)
                    const actorColor = agentDef?.color
                      ?? ACTOR_TYPE_LABELS[entry.actorType]?.color
                      ?? '#A79B78'

                    return (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-b border-[rgba(167,155,120,0.09)] last:border-0 cursor-pointer transition-colors',
                          isExpanded ? 'bg-[rgba(167,155,120,0.07)]' : 'hover:bg-[rgba(167,155,120,0.04)]'
                        )}
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <td className="px-4 py-3 text-xs text-[#7A6F55] font-mono whitespace-nowrap">
                          <div>{formatRelativeDate(entry.createdAt)}</div>
                          <div className="text-[10px] text-[#5C5340] mt-0.5">
                            {new Date(entry.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {agentDef && <span className="text-sm">{agentDef.emoji}</span>}
                            <span className="text-xs font-medium capitalize" style={{ color: actorColor }}>
                              {actorLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#5C5340] mt-0.5 capitalize">
                            {entry.actorType}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color: typeColor, backgroundColor: `${typeColor}18` }}
                          >
                            {displayEventType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className={cn('text-sm text-[#E8DFCE]', !isExpanded && 'truncate max-w-md')}>
                            {entry.description ?? entry.entityTitle ?? '—'}
                          </p>
                          {isExpanded && entry.sourceUrl && (
                            <a
                              href={entry.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#5F7A72] hover:underline mt-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" /> Source
                            </a>
                          )}
                          {isExpanded && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {entry.sourceSystem && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(167,155,120,0.09)] text-[#7A6F55]">
                                  src: {entry.sourceSystem}
                                </span>
                              )}
                              {entry.apiModel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(95,122,114,0.10)] text-[#6E8B7E]">
                                  model: {entry.apiModel}
                                </span>
                              )}
                              {entry.workflowRunId && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(201,154,31,0.10)] text-[#C99A1F]">
                                  session: {entry.workflowRunId}
                                </span>
                              )}
                              {entry.category && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(167,155,120,0.09)] text-[#7A6F55]">
                                  cat: {entry.category}
                                </span>
                              )}
                              {entry.eventFamily && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(167,155,120,0.09)] text-[#7A6F55]">
                                  family: {entry.eventFamily}
                                </span>
                              )}
                              {entry.status && entry.status !== 'success' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(192,69,46,0.10)] text-[#C0452E]">
                                  {entry.status}
                                </span>
                              )}
                            </div>
                          )}
                          {isExpanded && entry.metadata != null && (
                            <pre className="text-[#5C5340] text-[10px] mt-2 overflow-x-auto bg-[#140F0B] rounded-none p-2">
                              {JSON.stringify(entry.metadata as Record<string, unknown>, null, 2)}
                            </pre>
                          )}
                        </td>
                        {!isGuest && (
                          <td className="px-4 py-3">
                            <span className="text-xs text-[#7A6F55]">
                              {workspaceLabel}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          {cost > 0 ? (
                            <span className="text-xs font-mono text-[#7D9B5E]">
                              ${cost.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-xs text-[#5C5340]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(167,155,120,0.13)]">
              <p className="text-xs text-[#7A6F55]">
                {displayEntries.length === 0 ? 'No results' : semanticResults ? `${displayEntries.length} semantic results` : `Showing ${((page - 1) * 50) + 1}–${((page - 1) * 50) + displayEntries.length}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => router.push(buildUrl({ page: page - 1 }))}
                  className="p-1.5 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#7A6F55] font-mono">Page {page}</span>
                <button
                  disabled={!hasMore}
                  onClick={() => router.push(buildUrl({ page: page + 1 }))}
                  className="p-1.5 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isGuest && (
        <p className="text-center text-xs text-[#5C5340] mt-4">
          Shared view — Cockpit
        </p>
      )}
    </div>
  )
}
