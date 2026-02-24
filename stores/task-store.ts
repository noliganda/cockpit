'use client';

import { useState, useCallback } from 'react';
import { Task } from '@/types';
import { MOCK_TASKS } from '@/lib/data';

let nextId = MOCK_TASKS.length + 1;

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);

  const getTasksForWorkspace = useCallback((workspaceId: string) => {
    return tasks.filter(t => t.workspaceId === workspaceId);
  }, [tasks]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: `task-${nextId++}`,
      createdAt: now,
      updatedAt: now,
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, ...updates, updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const moveTask = useCallback((taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
        : t
    ));
  }, []);

  return {
    tasks,
    getTasksForWorkspace,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
  };
}
