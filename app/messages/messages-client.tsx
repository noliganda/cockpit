'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Mail, MessageSquare, Hash, PenLine, Inbox, Link2, Eye, EyeOff } from 'lucide-react'

export interface CommItemView {
  id: string
  source: string
  workspaceId: string
  externalId: string
  sender: string
  subject: string
  preview: string
  classification: string
  actionTaken: string
  draftStatus: string | null
  urgency: string
  messageTs: string
  runId: string
  linkedTaskId: string | null
}

const WS_COLORS: Record<string, string> = {
  'byron-film': '#C99A1F',
  korus: '#3E7A70',
  personal: '#C96F2E',
}
const WS_LABELS: Record<string, string> = {
  'byron-film': 'Byron Film',
  korus: 'KORUS',
  personal: 'Personal',
}

const CLASSIFICATION_STYLES: Record<string, { color: string; label: string }> = {
  'needs-reply': { color: '#5F7A72', label: 'Needs reply' },
  invoice: { color: '#C9962E', label: 'Invoice' },
  newsletter: { color: '#7A6F55', label: 'Newsletter' },
  notification: { color: '#9B6B4F', label: 'Notification' },
  fyi: { color: '#A79B78', label: 'FYI' },
  spam: { color: '#7A6F55', label: 'Spam' },
  unknown: { color: '#7A6F55', label: 'Unknown' },
}

const ACTION_LABELS: Record<string, string> = {
  drafted: 'Draft prepared',
  archived: 'Archived',
  surfaced: 'Surfaced',
  left: 'Left in inbox',
  'queued-task': 'Task queued',
  none: '',
}

const SOURCE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  slack: Hash,
  manual: PenLine,
}

const HIDDEN_BY_DEFAULT = ['newsletter', 'spam']

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA') // YYYY-MM-DD, local tz
}

function dayLabel(key: string) {
  const today = new Date().toLocaleDateString('en-CA')
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function relativeTime(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function WorkspacePill({ workspaceId }: { workspaceId: string }) {
  const color = WS_COLORS[workspaceId] ?? '#7A6F55'
  return (
    <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-none uppercase tracking-[0.15em] shrink-0"
      style={{ background: `${color}22`, color }}>
      {WS_LABELS[workspaceId] ?? workspaceId}
    </span>
  )
}

function ClassificationBadge({ classification }: { classification: string }) {
  const s = CLASSIFICATION_STYLES[classification] ?? CLASSIFICATION_STYLES.unknown
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-none shrink-0"
      style={{ background: `${s.color}1A`, color: s.color }}>
      {s.label}
    </span>
  )
}

function FilterChip({ active, label, color, onClick }: { active: boolean; label: string; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-none border transition-all ${
        active
          ? 'text-[#E8DFCE] border-[rgba(167,155,120,0.35)] bg-[#201A14]'
          : 'text-[#7A6F55] border-[rgba(167,155,120,0.13)] hover:text-[#A79B78] hover:border-[rgba(167,155,120,0.22)]'
      }`}
      style={active && color ? { color, borderColor: `${color}50`, background: `${color}14` } : undefined}
    >
      {label}
    </button>
  )
}

function MessageCard({ item }: { item: CommItemView }) {
  const SourceIcon = SOURCE_ICONS[item.source] ?? Mail
  const action = ACTION_LABELS[item.actionTaken] ?? ''
  return (
    <div
      data-msg-item={item.externalId}
      className={`relative rounded-none border border-[rgba(167,155,120,0.13)] bg-[#1A1510] px-4 py-3 hover:border-[rgba(167,155,120,0.22)] transition-colors ${
        item.urgency === 'low' ? 'opacity-70' : ''
      }`}
    >
      {item.urgency === 'interrupt' && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#C0452E]" title="Interrupt" />
      )}
      <div className="flex items-start gap-3">
        <SourceIcon className="w-3.5 h-3.5 mt-0.5 text-[#7A6F55] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#E8DFCE] truncate max-w-[16rem]">{item.sender}</span>
            <WorkspacePill workspaceId={item.workspaceId} />
            <ClassificationBadge classification={item.classification} />
            {item.draftStatus === 'awaiting-review' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-none bg-[rgba(201,150,46,0.12)] text-[#C9962E] shrink-0">
                Draft awaiting review
              </span>
            )}
          </div>
          <p className="text-sm text-[#C9BEA3] truncate mt-0.5">{item.subject}</p>
          <p className="text-xs text-[#7A6F55] mt-1 line-clamp-2">{item.preview}</p>
          {(action || item.linkedTaskId) && (
            <div className="flex items-center gap-3 mt-1.5">
              {action && <span className="text-[11px] text-[#5C5340]">{action}</span>}
              {item.linkedTaskId && (
                <Link
                  href={`/tasks?workspace=${item.workspaceId}&task=${item.linkedTaskId}`}
                  className="inline-flex items-center gap-1 text-[11px] text-[#5F7A72] hover:underline"
                >
                  <Link2 className="w-3 h-3" /> Linked task
                </Link>
              )}
            </div>
          )}
        </div>
        <span className="text-[11px] text-[#5C5340] font-mono shrink-0" title={new Date(item.messageTs).toLocaleString()}>
          {relativeTime(item.messageTs)}
        </span>
      </div>
    </div>
  )
}

export function MessagesClient({ initialItems, initialDrafts }: { initialItems: CommItemView[]; initialDrafts: CommItemView[] }) {
  const [items, setItems] = useState(initialItems)
  const [wsFilter, setWsFilter] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<string | null>(null)
  const [classFilter, setClassFilter] = useState<string | null>(null)
  const [showHidden, setShowHidden] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(initialItems.length < 100)

  const filtered = useMemo(() => items.filter((i) => {
    if (wsFilter && i.workspaceId !== wsFilter) return false
    if (sourceFilter && i.source !== sourceFilter) return false
    if (classFilter) {
      if (i.classification !== classFilter) return false
    } else if (!showHidden && HIDDEN_BY_DEFAULT.includes(i.classification)) {
      return false
    }
    return true
  }), [items, wsFilter, sourceFilter, classFilter, showHidden])

  // Group by day, then by runId within the day (spec §5)
  const dayGroups = useMemo(() => {
    const days = new Map<string, Map<string, CommItemView[]>>()
    for (const item of filtered) {
      const dk = dayKey(item.messageTs)
      if (!days.has(dk)) days.set(dk, new Map())
      const runs = days.get(dk)!
      if (!runs.has(item.runId)) runs.set(item.runId, [])
      runs.get(item.runId)!.push(item)
    }
    return [...days.entries()].map(([dk, runs]) => ({ day: dk, runs: [...runs.entries()] }))
  }, [filtered])

  const hiddenCount = useMemo(
    () => (classFilter || showHidden) ? 0 : items.filter((i) => HIDDEN_BY_DEFAULT.includes(i.classification)).length,
    [items, classFilter, showHidden],
  )

  async function loadMore() {
    if (loadingMore || exhausted || items.length === 0) return
    setLoadingMore(true)
    try {
      const last = items[items.length - 1]
      const cursor = btoa(`${last.messageTs}|${last.id}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const res = await fetch(`/api/messages?limit=100&cursor=${cursor}`)
      if (res.ok) {
        const data = await res.json()
        setItems((prev) => [...prev, ...data.items])
        if (!data.nextCursor) setExhausted(true)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const workspaces = Object.keys(WS_LABELS)
  const sources = Object.keys(SOURCE_ICONS)
  const classifications = Object.keys(CLASSIFICATION_STYLES)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-4 border-b border-[rgba(167,155,120,0.13)]">
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Messages</h1>
        <p className="text-xs text-[#7A6F55] mt-1">
          Digest items published by the Email PA — previews only, the mailbox stays the source of truth.
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip active={wsFilter === null} label="All workspaces" onClick={() => setWsFilter(null)} />
            {workspaces.map((w) => (
              <FilterChip key={w} active={wsFilter === w} label={WS_LABELS[w]} color={WS_COLORS[w]} onClick={() => setWsFilter(wsFilter === w ? null : w)} />
            ))}
            {sources.map((s) => (
              <FilterChip key={s} active={sourceFilter === s} label={s} onClick={() => setSourceFilter(sourceFilter === s ? null : s)} />
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {classifications.map((c) => (
              <FilterChip key={c} active={classFilter === c} label={CLASSIFICATION_STYLES[c].label} color={CLASSIFICATION_STYLES[c].color} onClick={() => setClassFilter(classFilter === c ? null : c)} />
            ))}
            <button
              onClick={() => setShowHidden(!showHidden)}
              className="inline-flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors"
            >
              {showHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showHidden ? 'Hide newsletters & spam' : `Show newsletters & spam${hiddenCount ? ` (${hiddenCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
        {/* Drafts rail — top on mobile, right rail on desktop */}
        <aside data-drafts-rail className="lg:order-2 lg:w-72 shrink-0">
          <div className="rounded-none border border-[rgba(167,155,120,0.13)] bg-[#1A1510]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(167,155,120,0.13)]">
              <span className="text-xs font-semibold text-[#A79B78] uppercase tracking-widest">Drafts awaiting review</span>
              {initialDrafts.length > 0 && (
                <span className="text-xs font-mono text-[#C9962E]">{initialDrafts.length}</span>
              )}
            </div>
            <div className="px-4 py-2">
              {initialDrafts.length === 0 ? (
                <p className="text-xs text-[#5C5340] py-3 text-center">No drafts waiting — inbox zero on replies.</p>
              ) : (
                initialDrafts.map((d) => (
                  <div key={d.id} data-draft-item={d.externalId} className="py-2.5 border-b border-[rgba(167,155,120,0.09)] last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#E8DFCE] truncate">{d.sender}</span>
                      <span className="text-[10px] font-mono text-[#5C5340] shrink-0">{relativeTime(d.messageTs)}</span>
                    </div>
                    <p className="text-xs text-[#7A6F55] truncate mt-0.5">{d.subject}</p>
                    <WorkspacePill workspaceId={d.workspaceId} />
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Feed */}
        <div className="flex-1 min-w-0 lg:order-1">
          {dayGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="w-6 h-6 text-[#5C5340] mb-3" />
              <p className="text-sm text-[#7A6F55]">No messages yet. Digest items arrive automatically from the Email PA.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dayGroups.map(({ day, runs }) => (
                <section key={day} data-day-group={day}>
                  <h2 className="text-xs font-semibold text-[#A79B78] uppercase tracking-widest mb-2">{dayLabel(day)}</h2>
                  <div className="space-y-4">
                    {runs.map(([runId, runItems]) => (
                      <div key={runId} data-run-group={runId} className="space-y-1.5">
                        {runs.length > 1 && (
                          <p className="text-[10px] text-[#5C5340] font-mono pl-1">
                            run {runId.length > 24 ? `${runId.slice(0, 24)}…` : runId} · {runItems.length} item{runItems.length === 1 ? '' : 's'}
                          </p>
                        )}
                        {runItems.map((item) => <MessageCard key={item.id} item={item} />)}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {!exhausted && (
                <div className="flex justify-center pb-6">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-xs px-4 py-2 rounded-none border border-[rgba(167,155,120,0.13)] text-[#A79B78] hover:border-[rgba(167,155,120,0.22)] hover:text-[#E8DFCE] transition-all disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load older messages'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
