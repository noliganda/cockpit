'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, X, FileText, CheckSquare, FolderOpen, Users } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'

interface SearchResult {
  id: string
  type: 'task' | 'project' | 'note' | 'contact' | 'activity'
  title: string
  description?: string | null
  workspaceId: string
  score?: number
}

const TYPE_ICONS = {
  task: CheckSquare,
  project: FolderOpen,
  note: FileText,
  contact: Users,
  activity: Search,
}

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const { workspaceId } = useWorkspace()

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
      }
    } finally { setLoading(false) }
  }, [workspaceId])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, projects, notes, contacts…"
            className="flex-1 bg-transparent text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none"
          />
          {loading && <div className="w-3.5 h-3.5 border border-[#6B7280] border-t-transparent rounded-full animate-spin" />}
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {query && !loading && results.length === 0 && (
            <p className="text-sm text-[#4B5563] text-center py-6">No results for &ldquo;{query}&rdquo;</p>
          )}
          {!query && (
            <p className="text-sm text-[#4B5563] text-center py-6">Type to search…</p>
          )}
          {results.map(r => {
            const Icon = TYPE_ICONS[r.type] ?? Search
            return (
              <div key={r.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] hover:bg-[#222222] cursor-pointer transition-colors">
                <Icon className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#F5F5F5] truncate">{r.title}</p>
                  {r.description && <p className="text-xs text-[#6B7280] truncate">{r.description}</p>}
                </div>
                <span className="text-xs text-[#4B5563] capitalize">{r.type}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
