'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { WORKSPACES, type WorkspaceId, type Workspace } from '@/types'

interface WorkspaceContextType {
  workspaceId: WorkspaceId
  workspace: Workspace
  setWorkspace: (id: WorkspaceId) => void
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: 'byron-film',
  workspace: WORKSPACES[0],
  setWorkspace: () => {},
})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>('byron-film')

  useEffect(() => {
    // Read workspace from URL searchParams first, then fall back to localStorage
    const params = new URLSearchParams(window.location.search)
    const urlWorkspace = params.get('workspace') as WorkspaceId | null
    const stored = localStorage.getItem('workspace') as WorkspaceId | null

    const resolved = urlWorkspace ?? stored
    if (resolved && WORKSPACES.find(w => w.id === resolved)) {
      setWorkspaceId(resolved)
      localStorage.setItem('workspace', resolved)
    }
  }, [])

  const setWorkspace = (id: WorkspaceId) => {
    localStorage.setItem('workspace', id)
    setWorkspaceId(id)
  }

  const workspace = WORKSPACES.find(w => w.id === workspaceId) ?? WORKSPACES[0]

  return (
    <WorkspaceContext.Provider value={{ workspaceId, workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
