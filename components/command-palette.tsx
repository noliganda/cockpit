'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, Hash, FolderOpen, CheckSquare, X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import { WORKSPACES, type WorkspaceId } from '@/types'
import { toast } from 'sonner'

const QUICK_ACTIONS = [
  { id: 'home', label: 'Go to Home', href: '/dashboard', icon: Hash },
  { id: 'tasks', label: 'Go to Tasks', href: '/tasks', icon: CheckSquare },
  { id: 'projects', label: 'Go to Projects', href: '/projects', icon: FolderOpen },
  { id: 'calendar', label: 'Go to Calendar', href: '/calendar', icon: Hash },
  { id: 'kanban', label: 'Open Kanban', href: '/tasks/kanban', icon: Hash },
  { id: 'crm', label: 'Go to CRM', href: '/crm', icon: Hash },
  { id: 'notes', label: 'Go to Notes', href: '/notes', icon: Hash },
  { id: 'metrics', label: 'Go to Metrics', href: '/metrics', icon: Hash },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Hash },
]

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open command palette' },
  { keys: ['⌘', '⇧', 'T'], label: 'Quick task creation' },
  { keys: ['⌘', '1'], label: 'Switch to Byron Film' },
  { keys: ['⌘', '2'], label: 'Switch to KORUS' },
  { keys: ['⌘', '3'], label: 'Switch to Personal' },
  { keys: ['⌘', '/'], label: 'Show this help' },
  { keys: ['Esc'], label: 'Close overlay / dialog' },
  { keys: ['/'], label: 'Open command palette (unfocused)' },
  { keys: ['↑', '↓'], label: 'Navigate results' },
  { keys: ['↵'], label: 'Open selected' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [showQuickTask, setShowQuickTask] = useState(false)
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { workspace, workspaceId, setWorkspace } = useWorkspace()

  const filtered = QUICK_ACTIONS.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase())
  )

  const navigate = useCallback((href: string) => {
    router.push(`${href}?workspace=${workspaceId}`)
    setOpen(false)
    setQuery('')
    setSelected(0)
  }, [router, workspaceId])

  const switchWorkspace = useCallback((id: WorkspaceId) => {
    setWorkspace(id)
    const ws = WORKSPACES.find(w => w.id === id)
    toast.success(`Switched to ${ws?.name ?? id}`)
    // Navigate to current path with new workspace param
    const url = new URL(window.location.href)
    url.searchParams.set('workspace', id)
    router.push(url.pathname + '?' + url.searchParams.toString())
  }, [setWorkspace, router])

  async function createQuickTask() {
    if (!quickTaskTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, title: quickTaskTitle.trim(), status: 'To Do' }),
      })
      if (!res.ok) throw new Error()
      setQuickTaskTitle('')
      setShowQuickTask(false)
      toast.success('Task created')
      router.refresh()
    } catch {
      toast.error('Failed to create task')
    } finally { setSaving(false) }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+K — command palette
      if (meta && e.key === 'k') {
        e.preventDefault()
        setShowHelp(false)
        setShowQuickTask(false)
        setOpen(o => !o)
        return
      }

      // Cmd+/ — shortcut help
      if (meta && e.key === '/') {
        e.preventDefault()
        setOpen(false)
        setShowQuickTask(false)
        setShowHelp(h => !h)
        return
      }

      // Cmd+Shift+T — quick task
      if (meta && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        setOpen(false)
        setShowHelp(false)
        setShowQuickTask(t => !t)
        return
      }

      // Cmd+1/2/3 — workspace switch
      if (meta && e.key === '1') { e.preventDefault(); switchWorkspace('byron-film'); return }
      if (meta && e.key === '2') { e.preventDefault(); switchWorkspace('korus'); return }
      if (meta && e.key === '3') { e.preventDefault(); switchWorkspace('personal'); return }

      // "/" — open command palette (unfocused)
      if (e.key === '/') {
        const el = document.activeElement
        if (!el) return
        const tag = el.tagName
        if (['INPUT', 'TEXTAREA'].includes(tag)) return
        if ((el as HTMLElement).isContentEditable) return
        if (el.closest('.bn-editor') || el.closest('[data-blocknote]')) return
        e.preventDefault()
        setShowHelp(false)
        setShowQuickTask(false)
        setOpen(o => !o)
        return
      }

      // Esc — close everything
      if (e.key === 'Escape') {
        if (open) { setOpen(false); setQuery(''); return }
        if (showHelp) { setShowHelp(false); return }
        if (showQuickTask) { setShowQuickTask(false); return }
        return
      }

      // Palette navigation
      if (!open) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && filtered[selected]) navigate(filtered[selected].href)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, showHelp, showQuickTask, filtered, selected, navigate, switchWorkspace])

  useEffect(() => { setSelected(0) }, [query])

  return (
    <>
      {/* Command palette */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setOpen(false); setQuery('') }}
          />
          <div className="relative w-full max-w-lg mx-4 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden">
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
              <button
                onClick={() => { setOpen(false); setShowHelp(true) }}
                className="flex items-center gap-1 text-xs text-[#4B5563] hover:text-[#6B7280] transition-colors"
              >
                <Keyboard className="w-3 h-3" />
                <span>Shortcuts</span>
              </button>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color }} />
              <span className="text-xs text-[#4B5563]">{workspace.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick task creation */}
      {showQuickTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickTask(false)} />
          <div className="relative w-full max-w-md mx-4 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Quick Task</h3>
              <button onClick={() => setShowQuickTask(false)} className="w-6 h-6 flex items-center justify-center text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              autoFocus
              value={quickTaskTitle}
              onChange={e => setQuickTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createQuickTask() }}
              placeholder="Task title..."
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] mb-3"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color }} />
                <span className="text-xs text-[#6B7280]">{workspace.name}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowQuickTask(false)} className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={createQuickTask}
                  disabled={saving || !quickTaskTitle.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-[#F5F5F5] rounded-[6px] border border-[rgba(255,255,255,0.10)] hover:bg-[#222222] disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create ↵'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help overlay */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[#6B7280]" />
                <h3 className="text-sm font-semibold text-[#F5F5F5]">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowHelp(false)} className="w-7 h-7 flex items-center justify-center text-[#6B7280] hover:text-[#F5F5F5] rounded-[6px] hover:bg-[#222222]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-1">
                  <span className="text-sm text-[#A0A0A0]">{s.label}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="text-[11px] text-[#6B7280] bg-[#0F0F0F] border border-[rgba(255,255,255,0.10)] rounded px-1.5 py-0.5 font-mono"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: workspace.color }} />
              <span className="text-xs text-[#4B5563]">Current: {workspace.name}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
