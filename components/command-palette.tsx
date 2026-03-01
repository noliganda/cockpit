'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, Hash, FolderOpen, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'

const QUICK_ACTIONS = [
  { id: 'home', label: 'Go to Home', href: '/dashboard', icon: Hash },
  { id: 'tasks', label: 'Go to Tasks', href: '/tasks', icon: CheckSquare },
  { id: 'projects', label: 'Go to Projects', href: '/projects', icon: FolderOpen },
  { id: 'kanban', label: 'Open Kanban', href: '/tasks/kanban', icon: Hash },
  { id: 'crm', label: 'Go to CRM', href: '/crm', icon: Hash },
  { id: 'notes', label: 'Go to Notes', href: '/notes', icon: Hash },
  { id: 'metrics', label: 'Go to Metrics', href: '/metrics', icon: Hash },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Hash },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const router = useRouter()
  const { workspace } = useWorkspace()

  const filtered = QUICK_ACTIONS.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  )

  const navigate = useCallback((href: string) => {
    router.push(href)
    setOpen(false)
    setQuery('')
    setSelected(0)
  }, [router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === '/') {
        const el = document.activeElement
        if (!el) return
        const tag = el.tagName
        if (['INPUT', 'TEXTAREA'].includes(tag)) return
        if ((el as HTMLElement).isContentEditable) return
        if (el.closest('.bn-editor') || el.closest('[data-blocknote]')) return
        e.preventDefault()
        setOpen(o => !o)
      }
      if (!open) return
      if (e.key === 'Escape') { setOpen(false); setQuery(''); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && filtered[selected]) navigate(filtered[selected].href)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, selected, navigate])

  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { setOpen(false); setQuery('') }}
      />
      <div className="relative w-full max-w-lg mx-4 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search or navigate..."
            className="flex-1 bg-transparent text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none"
          />
          <kbd className="text-xs text-[#4B5563] border border-[rgba(255,255,255,0.06)] rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-[#4B5563] text-center py-6">No results</p>
          ) : (
            filtered.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-left transition-colors',
                    i === selected ? 'bg-[#222222] text-[#F5F5F5]' : 'text-[#A0A0A0] hover:bg-[#222222] hover:text-[#F5F5F5]'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm flex-1">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[rgba(255,255,255,0.06)]">
          <span className="text-xs text-[#4B5563]">↑↓ navigate</span>
          <span className="text-xs text-[#4B5563]">↵ open</span>
          <div className="flex-1" />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color }} />
          <span className="text-xs text-[#4B5563]">{workspace.name}</span>
        </div>
      </div>
    </div>
  )
}
