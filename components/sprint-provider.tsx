'use client';

import { useCallback, ReactNode } from 'react';
import { Sprint } from '@/types';
import { SprintContext } from '@/stores/sprint-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function SprintProvider({ children }: { children: ReactNode }) {
  const [sprints, setSprints] = useLocalStorage<Sprint[]>('ops_sprints', []);

  const getSprintsForWorkspace = useCallback((workspaceId: string) => {
    return sprints.filter(s => s.workspaceId === workspaceId);
  }, [sprints]);

  const addSprint = useCallback((sprint: Omit<Sprint, 'id' | 'createdAt'>): Sprint => {
    const now = new Date().toISOString();
    const id = `sprint-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newSprint: Sprint = { ...sprint, id, createdAt: now };
    setSprints(prev => {
      if (prev.some(s => s.id === id)) return prev;
      return [...prev, newSprint];
    });
    return newSprint;
  }, [setSprints]);

  const updateSprint = useCallback((id: string, updates: Partial<Sprint>) => {
    setSprints(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setSprints]);

  const deleteSprint = useCallback((id: string) => {
    setSprints(prev => prev.filter(s => s.id !== id));
  }, [setSprints]);

  const addTaskToSprint = useCallback((sprintId: string, taskId: string) => {
    setSprints(prev => prev.map(s =>
      s.id === sprintId && !s.taskIds.includes(taskId)
        ? { ...s, taskIds: [...s.taskIds, taskId] }
        : s
    ));
  }, [setSprints]);

  const removeTaskFromSprint = useCallback((sprintId: string, taskId: string) => {
    setSprints(prev => prev.map(s =>
      s.id === sprintId
        ? { ...s, taskIds: s.taskIds.filter(id => id !== taskId) }
        : s
    ));
  }, [setSprints]);

  return (
    <SprintContext.Provider value={{
      sprints,
      getSprintsForWorkspace,
      addSprint,
      updateSprint,
      deleteSprint,
      addTaskToSprint,
      removeTaskFromSprint,
    }}>
      {children}
    </SprintContext.Provider>
  );
}
