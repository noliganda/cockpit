'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Pin, Trash2, ArrowLeft, Share2, X, Copy, Mail, MessageCircle, FileDown, Tag } from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { type WorkspaceId, type Note } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'

// Dynamic import to avoid SSR issues with BlockNote
const NoteEditor = dynamic(() => import('./note-editor').then(m => ({ default: m.NoteEditor })), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-sm text-[#4B5563]">Loading editor…</p></div>,
})

interface SimpleItem { id: string; name: string }

interface NotesClientProps {
  initialNotes: Note[]
  workspaceId: WorkspaceId
  projects?: SimpleItem[]
  areas?: SimpleItem[]
  sprints?: SimpleItem[]
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ note, onClose }: { note: Note; onClose: () => void }) {
  const [downloadFormat, setDownloadFormat] = useState<'md' | 'txt'>('md')
  const plaintext = note.contentPlaintext ?? ''

  function copyMarkdown() {
    const md = `# ${note.title}\n\n${plaintext}`
    navigator.clipboard.writeText(md).then(() => toast.success('Copied to clipboard'))
    onClose()
  }

  function openEmail() {
    const subject = encodeURIComponent(note.title)
    const body = encodeURIComponent(`${note.title}\n\n${plaintext}`)
    window.open(`mailto:?subject=${subject}&body=${body}`)
    onClose()
  }

  function openWhatsApp() {
    const text = encodeURIComponent(`*${note.title}*\n\n${plaintext}`)
    window.open(`https://wa.me/?text=${text}`)
    onClose()
  }

  function download() {
    const content = downloadFormat === 'md' ? `# ${note.title}\n\n${plaintext}` : `${note.title}\n\n${plaintext}`
    const mime = downloadFormat === 'md' ? 'text/markdown' : 'text/plain'
    const ext = downloadFormat
    const slug = note.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40)
    const date = new Date().toISOString().slice(0, 10)
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `note-${slug}-${date}.${ext}`
    a.click()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Share note</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-2">
          <button
            onClick={copyMarkdown}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] text-sm text-[#F5F5F5] transition-colors text-left"
          >
            <Copy className="w-4 h-4 text-[#6B7280] shrink-0" />
            <span>Copy as Markdown</span>
          </button>
          <button
            onClick={openEmail}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] text-sm text-[#F5F5F5] transition-colors text-left"
          >
            <Mail className="w-4 h-4 text-[#6B7280] shrink-0" />
            <span>Send via Email</span>
          </button>
          <button
            onClick={openWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] text-sm text-[#F5F5F5] transition-colors text-left"
          >
            <MessageCircle className="w-4 h-4 text-[#6B7280] shrink-0" />
            <span>Share via WhatsApp</span>
          </button>

          {/* Download with format picker */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <FileDown className="w-4 h-4 text-[#6B7280] shrink-0" />
            <span className="text-sm text-[#F5F5F5] flex-1">Download as</span>
            <div className="flex gap-1">
              <button
                onClick={() => setDownloadFormat('md')}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-[4px] border transition-colors',
                  downloadFormat === 'md'
                    ? 'bg-[#222222] border-[rgba(255,255,255,0.16)] text-[#F5F5F5]'
                    : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
                )}
              >.md</button>
              <button
                onClick={() => setDownloadFormat('txt')}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-[4px] border transition-colors',
                  downloadFormat === 'txt'
                    ? 'bg-[#222222] border-[rgba(255,255,255,0.16)] text-[#F5F5F5]'
                    : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
                )}
              >.txt</button>
            </div>
            <button
              onClick={download}
              className="px-2.5 py-1 text-xs bg-[#F5F5F5] text-[#0F0F0F] rounded-[4px] font-medium hover:bg-white transition-colors ml-1"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirmation ───────────────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-6 max-w-sm w-full">
        <h2 className="text-sm font-semibold text-[#F5F5F5] mb-2">Delete this note?</h2>
        <p className="text-xs text-[#6B7280] mb-4">This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium bg-[#EF4444] text-white rounded-[6px] hover:bg-red-500 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ─── Metadata selector row ────────────────────────────────────────────────────
function MetaSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null | undefined
  options: SimpleItem[]
  onChange: (id: string | null) => void
}) {
  if (options.length === 0) return null
  const selected = options.find(o => o.id === value)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#4B5563] w-14 shrink-0">{label}</span>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="text-xs bg-transparent border-0 outline-none text-[#6B7280] hover:text-[#A0A0A0] cursor-pointer"
      >
        <option value="">—</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {selected && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{selected.name}</span>
      )}
    </div>
  )
}

export function NotesClient({ initialNotes, workspaceId, projects = [], areas = [], sprints = [] }: NotesClientProps) {
  const [notesList, setNotesList] = useState(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
  const [mobileShowEditor, setMobileShowEditor] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { workspace } = useWorkspace()

  const selectedNote = notesList.find(n => n.id === selectedId) ?? null

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note', workspaceId, content: [] }),
      })
      if (res.ok) {
        const note = await res.json() as Note
        setNotesList(prev => [note, ...prev])
        setSelectedId(note.id)
      }
    } finally { setCreating(false) }
  }

  async function handleSave(id: string, content: unknown, plaintext: string) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, contentPlaintext: plaintext, updatedAt: new Date() }),
    })
    if (res.ok) {
      const updated = await res.json() as Note
      setNotesList(prev => prev.map(n => n.id === id ? updated : n))
    }
  }

  async function handleTitleChange(id: string, title: string) {
    if (!title.trim()) return
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (res.ok) {
      const updated = await res.json() as Note
      setNotesList(prev => prev.map(n => n.id === id ? updated : n))
    }
  }

  async function handleMeta(id: string, field: 'projectId' | 'areaId' | 'sprintId', value: string | null) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    if (res.ok) {
      const updated = await res.json() as Note
      setNotesList(prev => prev.map(n => n.id === id ? updated : n))
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotesList(prev => prev.filter(n => n.id !== id))
    if (selectedId === id) setSelectedId(notesList.find(n => n.id !== id)?.id ?? null)
    setShowDeleteConfirm(false)
  }

  async function handlePin(id: string, pinned: boolean) {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    if (res.ok) {
      const updated = await res.json() as Note
      setNotesList(prev => prev.map(n => n.id === id ? updated : n))
    }
  }

  const sorted = [...notesList].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })

  // Helper: get short badge for project/area on list items
  function getNoteBadge(note: Note) {
    if (note.projectId) {
      const p = projects.find(x => x.id === note.projectId)
      if (p) return p.name
    }
    if (note.areaId) {
      const a = areas.find(x => x.id === note.areaId)
      if (a) return a.name
    }
    return null
  }

  return (
    <div className="flex h-full">
      {/* Note list sidebar — hidden on mobile when editor is open */}
      <div className={cn(
        'shrink-0 border-r border-[rgba(255,255,255,0.06)] flex flex-col',
        'w-full md:w-64',
        mobileShowEditor ? 'hidden md:flex' : 'flex'
      )}>
        <div className="p-3 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <h1 className="text-sm font-semibold text-[#F5F5F5]">Notes</h1>
          <button onClick={handleCreate} disabled={creating}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {sorted.length === 0 ? (
            <p className="text-xs text-[#4B5563] text-center py-8">No notes yet</p>
          ) : sorted.map(note => {
            const badge = getNoteBadge(note)
            return (
              <button key={note.id} onClick={() => { setSelectedId(note.id); setMobileShowEditor(true) }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-[6px] mb-1 transition-colors group',
                  selectedId === note.id ? 'bg-[#1A1A1A]' : 'hover:bg-[#141414]'
                )}
                style={selectedId === note.id ? { borderLeft: `2px solid ${workspace.color}`, paddingLeft: '10px' } : undefined}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {note.pinned && <Pin className="w-3 h-3 text-[#6B7280] shrink-0" />}
                  <p className="text-xs font-medium text-[#F5F5F5] truncate flex-1">{note.title || 'Untitled'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-[#4B5563]">{formatRelativeDate(note.updatedAt)}</p>
                  {badge && (
                    <span className="text-xs px-1.5 py-0 rounded bg-[rgba(255,255,255,0.06)] text-[#6B7280] truncate max-w-[80px]">{badge}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Editor area — hidden on mobile when showing list */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 overflow-hidden',
        mobileShowEditor ? 'flex' : 'hidden md:flex'
      )}>
        {selectedNote ? (
          <>
            {/* Note header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <button
                onClick={() => setMobileShowEditor(false)}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded text-[#6B7280] hover:text-[#F5F5F5] mr-2 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <input
                key={selectedNote.id}
                defaultValue={selectedNote.title}
                onBlur={e => handleTitleChange(selectedNote.id, e.target.value)}
                className="bg-transparent text-lg font-bold text-[#F5F5F5] outline-none flex-1 min-w-0"
                placeholder="Untitled"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowShare(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors"
                  title="Share note"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePin(selectedNote.id, !selectedNote.pinned)}
                  className={cn('w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors',
                    selectedNote.pinned ? 'text-[#F5F5F5] bg-[rgba(255,255,255,0.08)]' : 'text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141414]'
                  )}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[#141414] transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metadata row */}
            {(projects.length > 0 || areas.length > 0 || sprints.length > 0) && (
              <div className="flex items-center gap-4 px-4 md:px-6 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)] flex-wrap">
                <Tag className="w-3 h-3 text-[#4B5563] shrink-0" />
                <MetaSelect
                  label="Project"
                  value={selectedNote.projectId}
                  options={projects}
                  onChange={v => void handleMeta(selectedNote.id, 'projectId', v)}
                />
                <MetaSelect
                  label="Area"
                  value={selectedNote.areaId}
                  options={areas}
                  onChange={v => void handleMeta(selectedNote.id, 'areaId', v)}
                />
                <MetaSelect
                  label="Sprint"
                  value={selectedNote.sprintId}
                  options={sprints}
                  onChange={v => void handleMeta(selectedNote.id, 'sprintId', v)}
                />
              </div>
            )}

            {/* BlockNote editor */}
            <div className="flex-1 overflow-y-auto">
              <NoteEditor
                key={selectedNote.id}
                note={selectedNote}
                onSave={(content, plaintext) => handleSave(selectedNote.id, content, plaintext)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-[#4B5563] mb-3">No note selected</p>
              <button onClick={handleCreate}
                className="px-4 py-2 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors">
                Create your first note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShare && selectedNote && (
        <ShareModal note={selectedNote} onClose={() => setShowShare(false)} />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedNote && (
        <DeleteConfirmModal
          onConfirm={() => void handleDelete(selectedNote.id)}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
