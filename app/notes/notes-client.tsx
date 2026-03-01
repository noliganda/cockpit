'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Pin, Trash2 } from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { type WorkspaceId, type Note } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'

// Dynamic import to avoid SSR issues with BlockNote
const NoteEditor = dynamic(() => import('./note-editor').then(m => ({ default: m.NoteEditor })), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center"><p className="text-sm text-[#4B5563]">Loading editor…</p></div>,
})

interface NotesClientProps {
  initialNotes: Note[]
  workspaceId: WorkspaceId
}

export function NotesClient({ initialNotes, workspaceId }: NotesClientProps) {
  const [notesList, setNotesList] = useState(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [creating, setCreating] = useState(false)
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

  async function handleDelete(id: string) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    setNotesList(prev => prev.filter(n => n.id !== id))
    if (selectedId === id) setSelectedId(notesList.find(n => n.id !== id)?.id ?? null)
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

  return (
    <div className="flex h-full">
      {/* Note list sidebar */}
      <div className="w-64 shrink-0 border-r border-[rgba(255,255,255,0.06)] flex flex-col">
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
          ) : sorted.map(note => (
            <button key={note.id} onClick={() => setSelectedId(note.id)}
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
              <p className="text-xs text-[#4B5563]">{formatRelativeDate(note.updatedAt)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedNote ? (
          <>
            {/* Note header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <input
                key={selectedNote.id}
                defaultValue={selectedNote.title}
                onBlur={e => handleTitleChange(selectedNote.id, e.target.value)}
                className="bg-transparent text-lg font-bold text-[#F5F5F5] outline-none flex-1 min-w-0"
                placeholder="Untitled"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePin(selectedNote.id, !selectedNote.pinned)}
                  className={cn('w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors',
                    selectedNote.pinned ? 'text-[#F5F5F5] bg-[rgba(255,255,255,0.08)]' : 'text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141414]'
                  )}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[#141414] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

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
    </div>
  )
}
