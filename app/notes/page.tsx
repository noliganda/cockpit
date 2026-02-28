'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WORKSPACES } from '@/types';
import type { Note } from '@/types';
import { formatRelativeDate, cn } from '@/lib/utils';
import { Plus, Pin, PinOff, Trash2, Search, FileText } from 'lucide-react';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterWs, setFilterWs] = useState('all');
  const [editorContent, setEditorContent] = useState('');
  const [editorTitle, setEditorTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch('/api/notes');
    const data = await res.json();
    if (data.data) setNotes(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const filtered = notes.filter((n) => {
    if (filterWs !== 'all' && n.workspaceId !== filterWs) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Pinned first
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  function selectNote(note: Note) {
    setSelected(note);
    setEditorTitle(note.title);
    setEditorContent(note.content ?? '');
  }

  async function createNote() {
    const wsId = filterWs !== 'all' ? filterWs : 'personal';
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled note', workspaceId: wsId }),
    });
    const data = await res.json();
    if (data.data) {
      setNotes((prev) => [data.data, ...prev]);
      selectNote(data.data);
    }
  }

  async function saveNote(partial: Partial<Note>) {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await res.json();
    if (data.data) {
      setNotes((prev) => prev.map((n) => n.id === data.data.id ? data.data : n));
      setSelected(data.data);
    }
    setSaving(false);
  }

  function handleTitleChange(val: string) {
    setEditorTitle(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote({ title: val }), 800);
  }

  function handleContentChange(val: string) {
    setEditorContent(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveNote({ content: val }), 800);
  }

  async function togglePin() {
    if (!selected) return;
    await saveNote({ pinned: !selected.pinned });
  }

  async function deleteNote() {
    if (!selected) return;
    await fetch(`/api/notes/${selected.id}`, { method: 'DELETE' });
    setNotes((prev) => prev.filter((n) => n.id !== selected.id));
    setSelected(null);
    setEditorTitle('');
    setEditorContent('');
  }

  const wsColor = (id: string) => WORKSPACES.find((w) => w.id === id)?.color ?? '#6B7280';
  const wsIcon = (id: string) => WORKSPACES.find((w) => w.id === id)?.icon ?? '';

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-4 flex-wrap gap-2"
      >
        <h1 className="text-2xl font-semibold text-white">Notes</h1>
        <Button size="sm" onClick={createNote}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Note
        </Button>
      </motion.div>

      <div className="flex flex-1 gap-0 overflow-hidden rounded-xl border border-[#2A2A2A]">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-[#2A2A2A] bg-[#1A1A1A] flex flex-col">
          {/* Sidebar filters */}
          <div className="p-3 space-y-2 border-b border-[#2A2A2A]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={filterWs} onValueChange={setFilterWs}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {WORKSPACES.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-[#6B7280]">Loading...</div>
            ) : sorted.length === 0 ? (
              <div className="p-4 text-center">
                <FileText className="h-6 w-6 text-[#2A2A2A] mx-auto mb-2" />
                <p className="text-xs text-[#6B7280]">No notes yet.</p>
                <button onClick={createNote} className="text-xs text-[#3B82F6] hover:underline mt-1">Create one</button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sorted.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={cn(
                      'w-full text-left rounded-lg p-3 transition-colors',
                      selected?.id === note.id
                        ? 'bg-[#2A2A2A] text-white'
                        : 'hover:bg-[#222222] text-[#A0A0A0]'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {note.pinned && <Pin className="h-3 w-3 text-[#F59E0B] shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white truncate">{note.title || 'Untitled'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px]" style={{ color: wsColor(note.workspaceId) }}>
                            {wsIcon(note.workspaceId)}
                          </span>
                          <span className="text-[10px] text-[#6B7280]">{formatRelativeDate(note.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 bg-[#0F0F0F] flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: wsColor(selected.workspaceId) }}
                  >
                    {wsIcon(selected.workspaceId)}{' '}
                    {WORKSPACES.find((w) => w.id === selected.workspaceId)?.name}
                  </span>
                  {saving && <span className="text-xs text-[#6B7280]">Saving…</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePin}>
                    {selected.pinned ? (
                      <PinOff className="h-3.5 w-3.5 text-[#F59E0B]" />
                    ) : (
                      <Pin className="h-3.5 w-3.5 text-[#6B7280]" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={deleteNote}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Title */}
              <div className="px-8 pt-8 pb-4">
                <input
                  value={editorTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Untitled note"
                  className="w-full text-3xl font-bold text-white bg-transparent border-none outline-none placeholder:text-[#3A3A3A]"
                />
              </div>

              {/* Workspace badge + date */}
              <div className="px-8 pb-4 flex items-center gap-3">
                <Badge className="text-[10px]" style={{ backgroundColor: wsColor(selected.workspaceId) + '22', color: wsColor(selected.workspaceId) }}>
                  {wsIcon(selected.workspaceId)} {WORKSPACES.find((w) => w.id === selected.workspaceId)?.name}
                </Badge>
                {selected.pinned && <Badge className="text-[10px] text-[#F59E0B] bg-[#F59E0B22]"><Pin className="h-2.5 w-2.5 mr-1" />Pinned</Badge>}
                <span className="text-xs text-[#6B7280]">Updated {formatRelativeDate(selected.updatedAt)}</span>
              </div>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto px-8 pb-8">
                <textarea
                  value={editorContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={`Start writing...\n\nTip: Use markdown formatting:\n# Heading\n**bold** _italic_ \`code\`\n- bullet point\n1. numbered list\n\n> blockquote\n\n\`\`\`\ncode block\n\`\`\``}
                  className="w-full h-full min-h-96 bg-transparent border-none outline-none text-[#A0A0A0] text-sm leading-relaxed resize-none placeholder:text-[#3A3A3A] font-mono"
                  style={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <FileText className="h-12 w-12 text-[#2A2A2A]" />
              <p className="text-sm text-[#6B7280]">Select a note or create a new one</p>
              <Button size="sm" variant="outline" onClick={createNote}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Note
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
