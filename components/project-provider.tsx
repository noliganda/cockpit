'use client';

import { useCallback, ReactNode } from 'react';
import { Project } from '@/types';
import { MOCK_PROJECTS } from '@/lib/data';
import { ProjectContext } from '@/stores/project-store';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useLocalStorage<Project[]>('ops_projects', MOCK_PROJECTS);

  const getProjectsForWorkspace = useCallback((workspaceId: string) => {
    return projects.filter(p => p.workspaceId === workspaceId);
  }, [projects]);

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  const addProject = useCallback((project: Omit<Project, 'id'>): Project => {
    const newProject: Project = {
      ...project,
      id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    setProjects(prev => {
      if (prev.some(p => p.id === newProject.id)) return prev;
      return [...prev, newProject];
    });
    return newProject;
  }, [setProjects]);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, [setProjects]);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, [setProjects]);

  return (
    <ProjectContext.Provider value={{ projects, getProjectsForWorkspace, getProjectById, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectContext.Provider>
  );
}
