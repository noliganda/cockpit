'use client';

import { useState, useCallback } from 'react';
import { WORKSPACES, Workspace } from '@/types';
import { WorkspaceContext } from '@/hooks/use-workspace';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState('byron-film');

  const workspace = WORKSPACES.find(w => w.id === workspaceId) ?? WORKSPACES[0];

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
