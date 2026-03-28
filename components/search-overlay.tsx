'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, FileText, CheckSquare, FolderOpen, Users, Activity, ScrollText, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'

interface SearchResult {
  id: string
  type: 'task' | 'project' | 'note' | 'contact' | 'activity' | 'log'
  title: string
  description?: string | null
  workspaceId: string
  score?: number
  meta?: string
}

const TYPE_ICONS = {
  task: CheckSquare,
  project: FolderOpen,
  note: FileText,
  contact: Users,
  activity: Activity,
  log: ScrollText,
}

const TYPE_ROUTES: Record<string, (id: string) => string> = {
  task: (id) => `/tasks?highlight=${id}`,
  project: (id) => `/projects/${id}`,
  note: (id) => `/notes?note=${id}`,
  contact: (id) => `/crm/${id}`,
  activity: () => '/logs',
  log: () => '/logs',
}

type FilterType = 'all' | 'task' | 'project' | 'note' | 'contact' | 'activity' | 'log'

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'task', label: 'Tasks' },
  { id: 'project', label: 'Projects' },
  { id: 'contact', label: 'Contacts' },
  { id: 'note', label: 'Notes' },
  { id: 'activity', label: 'Activity' },
  { id: 'log', label: 'Logs' },
]

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const { workspaceId } = useWorkspace()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredResults = filter === 'all' ? results : results.filter(r => r.type === filter)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, workspaceId }),
      })
      if (res.ok) {
        const data = await res.json() as { results: SearchResult[] }
        setResults(data.results)
        setSelectedIdx(0)
      }
    } finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => {
    const timer = setTimeout(() => void doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const navigateTo = useCallback((result: SearchResult) => {
    const getRoute = TYPE_ROUTES[result.type]
    if (getRoute) {
      router.push(getRoute(result.id))
    }
    onClose()
  }, [router, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, filteredResults.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && filteredResults[selectedIdx]) {
        navigateTo(filteredResults[selectedIdx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, filteredResults, selectedIdx, navigateTo])

  // Reset selected when filter changes
  useEffect(() => { setSelectedIdx(0) }, [filter])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)]">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, projects, notes, contacts…"
            className="flex-1 bg-transparent text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none"
          />
          {loading && <div className="w-3.5 h-3.5 border border-[#6B7280] border-t-transparent rounded-full animate-spin shrink-0" />}
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[rgba(255,255,255,0.04)] overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                filter === f.id
                  ? 'bg-[rgba(255,255,255,0.10)] text-[#F5F5F5]'
                  : 'text-[#6B7280] hover:text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.04)]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {query && !loading && filteredResults.length === 0 && (
            <p className="text-sm text-[#4B5563] text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          )}
          {!query && (
            <div className="py-8 text-center">
              <p className="text-sm text-[#4B5563]">Type to search…</p>
              <p className="text-xs text-[#4B5563] mt-1">Use ↑↓ to navigate, Enter to open</p>
            </div>
          )}
          {filteredResults.map((r, idx) => {
            const Icon = TYPE_ICONS[r.type] ?? Search
            return (
              <button
                key={r.id}
                onClick={() => navigateTo(r)}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  idx === selectedIdx ? 'bg-[#222222]' : 'hover:bg-[#1E1E1E]'
                )}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-[rgba(255,255,255,0.06)]">
                  <Icon className="w-3.5 h-3.5 text-[#6B7280]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F5F5F5] truncate">{r.title}</p>
                  {(r.meta ?? r.description) && (
                    <p className="text-xs text-[#6B7280] truncate mt-0.5">{r.meta ?? r.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[#4B5563] capitalize">{r.type}</span>
                  {r.score !== undefined && (
                    <span className="text-xs font-mono text-[#4B5563] flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-[#A855F7]" />{Math.round(r.score * 100)}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        {filteredResults.length > 0 && (
          <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.04)] flex items-center gap-4">
            <span className="text-xs text-[#4B5563]">↑↓ navigate</span>
            <span className="text-xs text-[#4B5563]">↵ open</span>
            <span className="text-xs text-[#4B5563]">esc close</span>
          </div>
        )}
      </div>
    </div>
  )
}
