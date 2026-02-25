'use client';

import { useCallback, ReactNode } from 'react';
import { Area } from '@/types';
import { MOCK_AREAS } from '@/lib/data';
import { AreaContext } from '@/stores/area-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function AreaProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useLocalStorage<Area[]>('ops_areas', MOCK_AREAS);

  const getAreasForWorkspace = useCallback((workspaceId: string) => {
    return areas.filter(a => a.workspaceId === workspaceId);
  }, [areas]);

  const getAreaById = useCallback((id: string) => {
    return areas.find(a => a.id === id);
  }, [areas]);

  const addArea = useCallback((area: Omit<Area, 'id'>): Area => {
    const newArea: Area = {
      ...area,
      id: `area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    setAreas(prev => [...prev, newArea]);
    return newArea;
  }, [setAreas]);

  const updateArea = useCallback((id: string, updates: Partial<Area>) => {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, [setAreas]);

  const deleteArea = useCallback((id: string) => {
    setAreas(prev => prev.filter(a => a.id !== id));
  }, [setAreas]);

  return (
    <AreaContext.Provider value={{ areas, getAreasForWorkspace, getAreaById, addArea, updateArea, deleteArea }}>
      {children}
    </AreaContext.Provider>
  );
}
