'use client';

import { createContext, useContext } from 'react';
import { Project } from '@/types';

export interface ProjectStoreValue {
  projects: Project[];
  getProjectsForWorkspace: (workspaceId: string) => Project[];
  getProjectById: (id: string) => Project | undefined;
  addProject: (project: Omit<Project, 'id'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

export const ProjectContext = createContext<ProjectStoreValue | null>(null);

export function useProjectStore(): ProjectStoreValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectStore must be used within ProjectProvider');
  return ctx;
}
