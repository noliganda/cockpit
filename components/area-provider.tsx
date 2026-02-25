'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Area } from '@/types';
import { MOCK_AREAS } from '@/lib/data';
import { AreaContext } from '@/stores/area-store';

let nextId = MOCK_AREAS.length + 1;

export function AreaProvider({ children }: { children: ReactNode }) {
  const [areas, setAreas] = useState<Area[]>(MOCK_AREAS);

  const getAreasForWorkspace = useCallback((workspaceId: string) => {
    return areas.filter(a => a.workspaceId === workspaceId);
  }, [areas]);

  const getAreaById = useCallback((id: string) => {
    return areas.find(a => a.id === id);
  }, [areas]);

  const addArea = useCallback((area: Omit<Area, 'id'>): Area => {
    const newArea: Area = { ...area, id: `area-${nextId++}-${Date.now()}` };
    setAreas(prev => [...prev, newArea]);
    return newArea;
  }, []);

  const updateArea = useCallback((id: string, updates: Partial<Area>) => {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteArea = useCallback((id: string) => {
    setAreas(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AreaContext.Provider value={{ areas, getAreasForWorkspace, getAreaById, addArea, updateArea, deleteArea }}>
      {children}
    </AreaContext.Provider>
  );
}
