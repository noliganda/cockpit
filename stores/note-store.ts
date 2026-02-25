'use client';

import { createContext, useContext } from 'react';
import { Note } from '@/types';

export interface NoteStoreValue {
  notes: Note[];
  getNotesForWorkspace: (workspaceId: string) => Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
}

export const NoteContext = createContext<NoteStoreValue | null>(null);

export function useNoteStore(): NoteStoreValue {
  const ctx = useContext(NoteContext);
  if (!ctx) throw new Error('useNoteStore must be used within NoteProvider');
  return ctx;
}
