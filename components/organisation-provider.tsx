'use client';

import { useCallback, ReactNode } from 'react';
import { Organisation } from '@/types';
import { OrganisationContext } from '@/stores/organisation-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const [organisations, setOrganisations] = useLocalStorage<Organisation[]>('ops_organisations', []);

  const getOrganisationsForWorkspace = useCallback((workspaceId: string) => {
    return organisations.filter(o => o.workspaceId === workspaceId);
  }, [organisations]);

  const getOrganisationById = useCallback((id: string) => {
    return organisations.find(o => o.id === id);
  }, [organisations]);

  const addOrganisation = useCallback((org: Omit<Organisation, 'id' | 'createdAt'>): Organisation => {
    const newOrg: Organisation = {
      ...org,
      id: `org-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setOrganisations(prev => [...prev, newOrg]);
    return newOrg;
  }, [setOrganisations]);

  const updateOrganisation = useCallback((id: string, updates: Partial<Organisation>) => {
    setOrganisations(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, [setOrganisations]);

  const deleteOrganisation = useCallback((id: string) => {
    setOrganisations(prev => prev.filter(o => o.id !== id));
  }, [setOrganisations]);

  return (
    <OrganisationContext.Provider value={{ organisations, getOrganisationsForWorkspace, getOrganisationById, addOrganisation, updateOrganisation, deleteOrganisation }}>
      {children}
    </OrganisationContext.Provider>
  );
}
