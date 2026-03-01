'use client'
import { createContext, useContext, useState, type ReactNode } from 'react'

interface SidebarContextType {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => {},
  setMobileOpen: () => {},
})

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{
      collapsed,
      mobileOpen,
      toggleCollapsed: () => setCollapsed(c => !c),
      setMobileOpen,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
