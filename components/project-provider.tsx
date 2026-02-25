'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Project } from '@/types';
import { MOCK_PROJECTS } from '@/lib/data';
import { ProjectContext } from '@/stores/project-store';

let nextId = MOCK_PROJECTS.length + 1;

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  const getProjectsForWorkspace = useCallback((workspaceId: string) => {
    return projects.filter(p => p.workspaceId === workspaceId);
  }, [projects]);

  const getProjectById = useCallback((id: string) => {
    return projects.find(p => p.id === id);
  }, [projects]);

  const addProject = useCallback((project: Omit<Project, 'id'>): Project => {
    const newProject: Project = {
      ...project,
      id: `proj-${nextId++}-${Date.now()}`,
    };
    setProjects(prev => {
      if (prev.some(p => p.id === newProject.id)) return prev;
      return [...prev, newProject];
    });
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <ProjectContext.Provider value={{ projects, getProjectsForWorkspace, getProjectById, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectContext.Provider>
  );
}
