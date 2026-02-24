'use client';

import { createContext, useContext } from 'react';
import { Task } from '@/types';

export interface TaskStoreValue {
  tasks: Task[];
  getTasksForWorkspace: (workspaceId: string) => Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (taskId: string, newStatus: string) => void;
}

export const TaskContext = createContext<TaskStoreValue | null>(null);

export function useTaskStore(): TaskStoreValue {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTaskStore must be used within TaskProvider');
  return ctx;
}
