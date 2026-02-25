'use client';

import { useCallback, ReactNode } from 'react';
import { Note } from '@/types';
import { NoteContext } from '@/stores/note-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useLocalStorage<Note[]>('ops_notes', []);

  const getNotesForWorkspace = useCallback((workspaceId: string) => {
    return notes.filter(n => n.workspaceId === workspaceId);
  }, [notes]);

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note => {
    const now = new Date().toISOString();
    const newNote: Note = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  }, [setNotes]);

  const updateNote = useCallback((id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n,
    ));
  }, [setNotes]);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, [setNotes]);

  return (
    <NoteContext.Provider value={{ notes, getNotesForWorkspace, addNote, updateNote, deleteNote }}>
      {children}
    </NoteContext.Provider>
  );
}
