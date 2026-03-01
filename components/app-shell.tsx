'use client'
import { usePathname } from 'next/navigation'
import { WorkspaceProvider } from '@/hooks/use-workspace'
import { SidebarProvider } from '@/hooks/use-sidebar'
import { Sidebar } from '@/components/sidebar'
import { MainContent } from '@/components/main-content'
import { CommandPalette } from '@/components/command-palette'
import type { ReactNode } from 'react'

const NO_SHELL_PATHS = ['/login', '/metrics/korus']

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showShell = !NO_SHELL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!showShell) return <>{children}</>

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <MainContent>
            {children}
          </MainContent>
        </div>
        <CommandPalette />
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
