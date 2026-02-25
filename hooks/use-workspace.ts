'use client';

import { useContext, createContext } from 'react';
import { Workspace, WORKSPACES } from '@/types';

interface WorkspaceContextValue {
  workspace: Workspace;
  setWorkspaceId: (id: string) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspace: WORKSPACES[0],
  setWorkspaceId: () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

/** Returns the workspace accent color, checking localStorage overrides first. */
export function getWorkspaceColor(id: string): string {
  try {
    const saved = localStorage.getItem('workspace_colors');
    if (saved) {
      const colors: Record<string, string> = JSON.parse(saved);
      if (colors[id]) return colors[id];
    }
  } catch { /* ignore */ }
  return WORKSPACES.find(w => w.id === id)?.color ?? '#D4A017';
}
