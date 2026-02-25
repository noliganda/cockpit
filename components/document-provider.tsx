'use client';

import { useCallback, ReactNode } from 'react';
import { ProjectDocument } from '@/types';
import { DocumentContext } from '@/stores/document-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useLocalStorage<ProjectDocument[]>('ops_project_documents', []);

  const getDocumentsForProject = useCallback((projectId: string) => {
    return documents.filter(d => d.projectId === projectId);
  }, [documents]);

  const addDocument = useCallback((doc: Omit<ProjectDocument, 'id' | 'addedAt'>): ProjectDocument => {
    const newDoc: ProjectDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      addedAt: new Date().toISOString(),
    };
    setDocuments(prev => [...prev, newDoc]);
    return newDoc;
  }, [setDocuments]);

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, [setDocuments]);

  return (
    <DocumentContext.Provider value={{ documents, getDocumentsForProject, addDocument, deleteDocument }}>
      {children}
    </DocumentContext.Provider>
  );
}
