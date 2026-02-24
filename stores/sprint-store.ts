'use client';

import { createContext, useContext } from 'react';
import { Sprint } from '@/types';

export interface SprintStoreValue {
  sprints: Sprint[];
  getSprintsForWorkspace: (workspaceId: string) => Sprint[];
  addSprint: (sprint: Omit<Sprint, 'id' | 'createdAt'>) => Sprint;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;
  addTaskToSprint: (sprintId: string, taskId: string) => void;
  removeTaskFromSprint: (sprintId: string, taskId: string) => void;
}

export const SprintContext = createContext<SprintStoreValue | null>(null);

export function useSprintStore(): SprintStoreValue {
  const ctx = useContext(SprintContext);
  if (!ctx) throw new Error('useSprintStore must be used within SprintProvider');
  return ctx;
}
