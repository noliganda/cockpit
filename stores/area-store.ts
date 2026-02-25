'use client';

import { createContext, useContext } from 'react';
import { Area } from '@/types';

export interface AreaStoreValue {
  areas: Area[];
  getAreasForWorkspace: (workspaceId: string) => Area[];
  getAreaById: (id: string) => Area | undefined;
  addArea: (area: Omit<Area, 'id'>) => Area;
  updateArea: (id: string, updates: Partial<Area>) => void;
  deleteArea: (id: string) => void;
}

export const AreaContext = createContext<AreaStoreValue | null>(null);

export function useAreaStore(): AreaStoreValue {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error('useAreaStore must be used within AreaProvider');
  return ctx;
}
