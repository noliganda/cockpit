'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pin, Trash2, NotebookPen, FileText } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useNoteStore } from '@/stores/note-store';
import { Note } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────────────

function notePreview(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, 80);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { getNotesForWorkspace, addNote, updateNote, deleteNote } = useNoteStore();

  const wsNotes = useMemo(() => getNotesForWorkspace(workspace.id), [getNotesForWorkspace, workspace.id]);

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Sort: pinned first, then by updatedAt desc
  const sortedNotes = useMemo(() => {
    const filtered = wsNotes.filter(n =>
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [wsNotes, search]);

  const selectedNote = useMemo(() => wsNotes.find(n => n.id === selectedId) ?? null, [wsNotes, selectedId]);

  // Load selected note into editor
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on title/content change (debounced 600ms)
  const scheduleAutoSave = useCallback((nextTitle: string, nextContent: string) => {
    if (!selectedId) return;
    if (saveTimer) clearTimeout(saveTimer);
    const t = setTimeout(() => {
      updateNote(selectedId, { title: nextTitle || 'Untitled', content: nextContent });
    }, 600);
    setSaveTimer(t);
  }, [selectedId, saveTimer, updateNote]);

  function handleTitleChange(v: string) {
    setTitle(v);
    scheduleAutoSave(v, content);
  }

  function handleContentChange(v: string) {
    setContent(v);
    scheduleAutoSave(title, v);
  }

  function handleNewNote() {
    const note = addNote({
      workspaceId: workspace.id,
      title: 'Untitled',
      content: '',
      pinned: false,
    });
    setSelectedId(note.id);
  }

  function handleSelect(id: string) {
    // Flush pending save for current note before switching
    if (selectedId && saveTimer) {
      clearTimeout(saveTimer);
      updateNote(selectedId, { title: title || 'Untitled', content });
    }
    setSelectedId(id);
  }

  function handleDelete(id: string) {
    deleteNote(id);
    if (selectedId === id) setSelectedId(sortedNotes.find(n => n.id !== id)?.id ?? null);
  }

  function handlePin(note: Note) {
    updateNote(note.id, { pinned: !note.pinned });
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ marginTop: '-0px' }}>
      {/* ── Left panel — note list ────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-[#2A2A2A] flex flex-col bg-[#141414]">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-4 h-4" style={{ color: accentColor }} />
              <h1 className="text-sm font-semibold text-white">Notes</h1>
            </div>
            <button
              onClick={handleNewNote}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors text-black"
              style={{ background: accentColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]"
            />
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto p-2">
          {sortedNotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-8 h-8 text-[#3A3A3A] mx-auto mb-2" />
              <p className="text-xs text-[#6B7280]">{search ? 'No notes match' : 'No notes yet'}</p>
              {!search && (
                <button onClick={handleNewNote} className="text-xs mt-2 hover:opacity-80" style={{ color: accentColor }}>
                  Create your first note →
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sortedNotes.map(note => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => handleSelect(note.id)}
                  className={`group relative p-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                    selectedId === note.id
                      ? 'bg-[#2A2A2A]'
                      : 'hover:bg-[#1F1F1F]'
                  }`}
                >
                  {selectedId === note.id && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                      style={{ background: accentColor }}
                    />
                  )}
                  <div className="flex items-start justify-between gap-1 mb-0.5">
                    <p className="text-xs font-medium text-white truncate flex-1">
                      {note.pinned && <span className="mr-1 opacity-60">📌</span>}
                      {note.title || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); handlePin(note); }}
                        className="p-0.5 text-[#6B7280] hover:text-white transition-colors"
                        title={note.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(note.id); }}
                        className="p-0.5 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#6B7280] truncate">{notePreview(note.content) || 'Empty note'}</p>
                  <p className="text-[9px] text-[#3A3A3A] mt-1">{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer count */}
        <div className="px-4 py-2.5 border-t border-[#2A2A2A]">
          <p className="text-[10px] text-[#6B7280]">{wsNotes.length} note{wsNotes.length !== 1 ? 's' : ''} · {workspace.name}</p>
        </div>
      </div>

      {/* ── Right panel — editor ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0F0F0F]">
        {selectedNote ? (
          <>
            {/* Editor header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#2A2A2A]">
              <p className="text-[10px] text-[#6B7280]">
                Last edited {format(new Date(selectedNote.updatedAt), 'dd MMM yyyy, h:mm a')}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePin(selectedNote)}
                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                    selectedNote.pinned ? 'text-white' : 'text-[#6B7280] hover:text-white'
                  }`}
                  style={selectedNote.pinned ? { color: accentColor } : undefined}
                >
                  <Pin className="w-3 h-3" />
                  {selectedNote.pinned ? 'Pinned' : 'Pin'}
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded text-[#6B7280] hover:text-[#EF4444] transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            </div>

            {/* Title */}
            <input
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Note title…"
              className="w-full px-6 pt-5 pb-2 text-xl font-bold text-white bg-transparent focus:outline-none placeholder:text-[#3A3A3A]"
            />

            {/* Content */}
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="Start writing…"
              className="flex-1 w-full px-6 py-2 text-sm text-[#D0D0D0] bg-transparent focus:outline-none resize-none placeholder:text-[#3A3A3A] leading-relaxed"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <NotebookPen className="w-10 h-10 text-[#2A2A2A] mx-auto mb-3" />
              <p className="text-sm text-[#6B7280] font-medium">Select a note to edit</p>
              <p className="text-xs text-[#3A3A3A] mt-1">or</p>
              <button
                onClick={handleNewNote}
                className="mt-2 text-xs font-medium hover:opacity-80"
                style={{ color: accentColor }}
              >
                Create a new note →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
