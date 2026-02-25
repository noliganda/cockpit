'use client';

import { useCallback, ReactNode } from 'react';
import { Task } from '@/types';
import { MOCK_TASKS } from '@/lib/data';
import { TaskContext } from '@/stores/task-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('ops_tasks', MOCK_TASKS);

  const getTasksForWorkspace = useCallback((workspaceId: string) => {
    return tasks.filter(t => t.workspaceId === workspaceId);
  }, [tasks]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, [setTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
  }, [setTasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [setTasks]);

  const moveTask = useCallback((taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
    ));
  }, [setTasks]);

  return (
    <TaskContext.Provider value={{ tasks, getTasksForWorkspace, addTask, updateTask, deleteTask, moveTask }}>
      {children}
    </TaskContext.Provider>
  );
}
