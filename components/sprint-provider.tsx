'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Sprint } from '@/types';
import { SprintContext } from '@/stores/sprint-store';

let nextSprintId = 1;

export function SprintProvider({ children }: { children: ReactNode }) {
  const [sprints, setSprints] = useState<Sprint[]>([]);

  const getSprintsForWorkspace = useCallback((workspaceId: string) => {
    return sprints.filter(s => s.workspaceId === workspaceId);
  }, [sprints]);

  const addSprint = useCallback((sprint: Omit<Sprint, 'id' | 'createdAt'>): Sprint => {
    const now = new Date().toISOString();
    const id = `sprint-${nextSprintId++}-${Date.now()}`;
    const newSprint: Sprint = { ...sprint, id, createdAt: now };
    setSprints(prev => {
      // Guard: prevent duplicate IDs
      if (prev.some(s => s.id === id)) return prev;
      return [...prev, newSprint];
    });
    return newSprint;
  }, []);

  const updateSprint = useCallback((id: string, updates: Partial<Sprint>) => {
    setSprints(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSprint = useCallback((id: string) => {
    setSprints(prev => prev.filter(s => s.id !== id));
  }, []);

  const addTaskToSprint = useCallback((sprintId: string, taskId: string) => {
    setSprints(prev => prev.map(s =>
      s.id === sprintId && !s.taskIds.includes(taskId)
        ? { ...s, taskIds: [...s.taskIds, taskId] }
        : s
    ));
  }, []);

  const removeTaskFromSprint = useCallback((sprintId: string, taskId: string) => {
    setSprints(prev => prev.map(s =>
      s.id === sprintId
        ? { ...s, taskIds: s.taskIds.filter(id => id !== taskId) }
        : s
    ));
  }, []);

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
