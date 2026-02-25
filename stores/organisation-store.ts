'use client';

import { createContext, useContext } from 'react';
import { Organisation } from '@/types';

export interface OrganisationStoreValue {
  organisations: Organisation[];
  getOrganisationsForWorkspace: (workspaceId: string) => Organisation[];
  getOrganisationById: (id: string) => Organisation | undefined;
  addOrganisation: (org: Omit<Organisation, 'id' | 'createdAt'>) => Organisation;
  updateOrganisation: (id: string, updates: Partial<Organisation>) => void;
  deleteOrganisation: (id: string) => void;
}

export const OrganisationContext = createContext<OrganisationStoreValue | null>(null);

export function useOrganisationStore(): OrganisationStoreValue {
  const ctx = useContext(OrganisationContext);
  if (!ctx) throw new Error('useOrganisationStore must be used within OrganisationProvider');
  return ctx;
}
