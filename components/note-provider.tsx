'use client';

import { useCallback, ReactNode } from 'react';
import { ProjectNote } from '@/types';
import { NoteContext } from '@/stores/note-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function NoteProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useLocalStorage<ProjectNote[]>('ops_project_notes', []);

  const getNotesForProject = useCallback((projectId: string) => {
    return notes.filter(n => n.projectId === projectId);
  }, [notes]);

  const addNote = useCallback((note: Omit<ProjectNote, 'id' | 'createdAt' | 'updatedAt'>): ProjectNote => {
    const now = new Date().toISOString();
    const newNote: ProjectNote = {
      ...note,
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    setNotes(prev => [...prev, newNote]);
    return newNote;
  }, [setNotes]);

  const updateNote = useCallback((id: string, updates: Partial<ProjectNote>) => {
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
    ));
  }, [setNotes]);

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  }, [setNotes]);

  return (
    <NoteContext.Provider value={{ notes, getNotesForProject, addNote, updateNote, deleteNote }}>
      {children}
    </NoteContext.Provider>
  );
}
