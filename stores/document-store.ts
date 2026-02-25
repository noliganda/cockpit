'use client';

import { createContext, useContext } from 'react';
import { ProjectDocument } from '@/types';

export interface DocumentStoreValue {
  documents: ProjectDocument[];
  getDocumentsForProject: (projectId: string) => ProjectDocument[];
  addDocument: (doc: Omit<ProjectDocument, 'id' | 'addedAt'>) => ProjectDocument;
  deleteDocument: (id: string) => void;
}

export const DocumentContext = createContext<DocumentStoreValue | null>(null);

export function useDocumentStore(): DocumentStoreValue {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error('useDocumentStore must be used within DocumentProvider');
  return ctx;
}
