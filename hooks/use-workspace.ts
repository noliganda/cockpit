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
