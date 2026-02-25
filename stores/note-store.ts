'use client';

import { createContext, useContext } from 'react';
import { ProjectNote } from '@/types';

export interface NoteStoreValue {
  notes: ProjectNote[];
  getNotesForProject: (projectId: string) => ProjectNote[];
  addNote: (note: Omit<ProjectNote, 'id' | 'createdAt' | 'updatedAt'>) => ProjectNote;
  updateNote: (id: string, updates: Partial<ProjectNote>) => void;
  deleteNote: (id: string) => void;
}

export const NoteContext = createContext<NoteStoreValue | null>(null);

export function useNoteStore(): NoteStoreValue {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNoteStore must be used within NoteProvider');
  return ctx;
}
