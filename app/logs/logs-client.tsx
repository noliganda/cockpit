'use client'
import { useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, Filter, X, ExternalLink, DollarSign, Sparkles } from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { AGENTS, ENTITIES } from '@/types'

interface LogEntry {
  id: string
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
  email_sent: '#3B82F6',
  email_received: '#60A5FA',
  task_updated: '#D4A017',
  task_created: '#EAB308',
  task_deleted: '#EF4444',
  invoice_created: '#22C55E',
  invoice_checked: '#34D399',
  expense_logged: '#F97316',
  outreach_call: '#14B8A6',
  lead_qualified: '#06B6D4',
  proposal_sent: '#8B5CF6',
  content_drafted: '#EC4899',
  research_completed: '#A855F7',
  code_deployed: '#3B82F6',
  code_committed: '#60A5FA',
  morning_brief: '#D4A017',
  system_maintenance: '#6B7280',
  // CRUD event types (from Phase 2 writers)
  project_created: '#22C55E',
  project_updated: '#D4A017',
  project_deleted: '#EF4444',
  area_created: '#22C55E',
  area_updated: '#D4A017',
  area_deleted: '#EF4444',
  sprint_created: '#22C55E',
  sprint_updated: '#D4A017',
  sprint_deleted: '#EF4444',
  contact_created: '#14B8A6',
  contact_updated: '#D4A017',
  contact_deleted: '#EF4444',
  organisation_created: '#14B8A6',
  organisation_updated: '#D4A017',
  organisation_deleted: '#EF4444',
  note_created: '#A855F7',
  note_updated: '#D4A017',
  note_deleted: '#EF4444',
  notion_sync_completed: '#6B7280',
  // Backfilled productivity actions
  reported_action: '#6B7280',
}

const ACTOR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  agent:   { label: 'Agent',   color: '#D4A017' },
  human:   { label: 'User',    color: '#3B82F6' },
  system:  { label: 'System',  color: '#6B7280' },
  webhook: { label: 'Webhook', color: '#8B5CF6' },
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
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">
            {isGuest ? 'Activity Log' : 'Operational Log'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {isGuest && guestLabel
              ? guestLabel
              : 'Unified operational events — agents, dashboard, syncs, and more.'}
          </p>
        </div>
        {!isGuest && totalCost > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.15)]">
            <DollarSign className="w-3.5 h-3.5 text-[#22C55E]" />
            <span className="text-xs font-mono text-[#22C55E]">
              ${totalCost.toFixed(4)} this page
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4B5563]" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              placeholder="Search events…"
              className="w-full pl-9 pr-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors"
            />
          </div>
          {!isGuest && (
            <select
              value={entity}
              onChange={e => setEntity(e.target.value)}
              className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
            >
              <option value="">All entities</option>
              {ENTITIES.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              <option value="shared">Shared</option>
            </select>
          )}
          <select
            value={actorType}
            onChange={e => setActorType(e.target.value)}
            className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
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
            className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
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
            className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
          >
            <option value="">All event types</option>
            {eventTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <button
            onClick={() => { setSemanticMode(!semanticMode); setSemanticResults(null); setSemanticError(null) }}
            className={cn(
              'px-3 py-2 rounded-[6px] border text-sm flex items-center gap-1.5 transition-colors',
              semanticMode
                ? 'bg-[rgba(168,85,247,0.12)] border-[rgba(168,85,247,0.3)] text-[#A855F7]'
                : 'bg-[#1A1A1A] border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5]'
            )}
            title={semanticMode ? 'Semantic search on — uses AI embeddings' : 'Switch to semantic search'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Semantic
          </button>
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-sm text-[#F5F5F5] hover:bg-[#222222] transition-colors flex items-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            {semanticMode ? 'Search' : 'Filter'}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="px-3 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {semanticMode && (
          <p className="text-xs text-[#A855F7]">
            Semantic search mode — enter a natural language query and press Enter or Search.
            {semanticLoading && ' Searching...'}
            {semanticError && <span className="text-[#EF4444] ml-2">{semanticError}</span>}
            {semanticResults && !semanticLoading && ` Found ${semanticResults.length} results.`}
          </p>
        )}
      </div>

      {/* Log table */}
      <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
        {displayEntries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[#4B5563]">{semanticMode ? 'No semantic results — try a different query' : 'No events found'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-36">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-28">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-36">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Description</th>
                    {!isGuest && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide w-20">Entity</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wide w-20">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map(entry => {
                    const displayEventType = entry.eventType ?? entry.action
                    const typeColor = EVENT_TYPE_COLORS[displayEventType] ?? '#6B7280'
                    const entityDef = ENTITIES.find(e => e.id === entry.entity)
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
                      ?? '#A0A0A0'

                    return (
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
                          <div className="flex items-center gap-1.5">
                            {agentDef && <span className="text-sm">{agentDef.emoji}</span>}
                            <span className="text-xs font-medium capitalize" style={{ color: actorColor }}>
                              {actorLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#4B5563] mt-0.5 capitalize">
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
                          <p className={cn('text-sm text-[#F5F5F5]', !isExpanded && 'truncate max-w-md')}>
                            {entry.description ?? entry.entityTitle ?? '—'}
                          </p>
                          {isExpanded && entry.sourceUrl && (
                            <a
                              href={entry.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#3B82F6] hover:underline mt-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" /> Source
                            </a>
                          )}
                          {isExpanded && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {entry.sourceSystem && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#6B7280]">
                                  src: {entry.sourceSystem}
                                </span>
                              )}
                              {entry.category && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#6B7280]">
                                  cat: {entry.category}
                                </span>
                              )}
                              {entry.eventFamily && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#6B7280]">
                                  family: {entry.eventFamily}
                                </span>
                              )}
                              {entry.status && entry.status !== 'success' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.10)] text-[#EF4444]">
                                  {entry.status}
                                </span>
                              )}
                            </div>
                          )}
                          {isExpanded && entry.metadata != null && (
                            <pre className="text-[#4B5563] text-[10px] mt-2 overflow-x-auto bg-[#0A0A0A] rounded-[4px] p-2">
                              {JSON.stringify(entry.metadata as Record<string, unknown>, null, 2)}
                            </pre>
                          )}
                        </td>
                        {!isGuest && (
                          <td className="px-4 py-3">
                            <span className="text-xs text-[#6B7280]">
                              {entityDef?.label ?? entry.entity ?? '—'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          {cost > 0 ? (
                            <span className="text-xs font-mono text-[#22C55E]">
                              ${cost.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-xs text-[#4B5563]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#6B7280]">
                {displayEntries.length === 0 ? 'No results' : semanticResults ? `${displayEntries.length} semantic results` : `Showing ${((page - 1) * 50) + 1}–${((page - 1) * 50) + displayEntries.length}`}
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
          </>
        )}
      </div>

      {isGuest && (
        <p className="text-center text-xs text-[#4B5563] mt-4">
          Shared view — Cockpit
        </p>
      )}
    </div>
  )
}
