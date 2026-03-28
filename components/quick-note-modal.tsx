'use client'
import { useState, useEffect, useRef } from 'react'
import { X, StickyNote } from 'lucide-react'
import { WORKSPACES, type WorkspaceId } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'

export function QuickNoteModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [wsId, setWsId] = useState<WorkspaceId>('byron-film')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const { workspace } = useWorkspace()

  // Sync initial workspace
  useEffect(() => {
    setWsId(workspace.id)
  }, [workspace.id])

  // Global Cmd+Shift+N listener
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Custom event bridge (so other components can open it)
  useEffect(() => {
    function handler() { setOpen(true) }
    window.addEventListener('quick-note-open', handler)
    return () => window.removeEventListener('quick-note-open', handler)
  }, [])

  // Focus title when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50)
    } else {
      setTitle('')
      setContent('')
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    try {
      const blocks = content.trim()
        ? [{ type: 'paragraph', content: [{ type: 'text', text: content, styles: {} }] }]
        : []
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), workspaceId: wsId, content: blocks, contentPlaintext: content }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Note created')
      setOpen(false)
    } catch {
      toast.error('Failed to create note')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <StickyNote className="w-4 h-4 text-[#6B7280] shrink-0" />
          <span className="text-sm font-semibold text-[#F5F5F5] flex-1">Quick Note</span>
          <kbd className="hidden sm:inline text-xs text-[#4B5563] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">⌘⇧N</kbd>
          <button onClick={() => setOpen(false)} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Workspace selector */}
          <select
            value={wsId}
            onChange={e => setWsId(e.target.value as WorkspaceId)}
            className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
          >
            {WORKSPACES.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.icon} {ws.name}</option>
            ))}
          </select>

          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); /* focus content */ } }}
            placeholder="Note title…"
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563] font-medium"
          />

          {/* Content */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Start writing…"
            rows={5}
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563] resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)]">
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">Cancel</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 rounded-[6px] bg-[#F5F5F5] text-[#0F0F0F] text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
