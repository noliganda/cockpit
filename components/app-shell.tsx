'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { WorkspaceProvider } from '@/hooks/use-workspace'
import { SidebarProvider } from '@/hooks/use-sidebar'
import { Sidebar } from '@/components/sidebar'
import { MainContent } from '@/components/main-content'
import { CommandPalette } from '@/components/command-palette'
import { SearchOverlay } from '@/components/search-overlay'
import { CharlieChat } from '@/components/charlie-chat'
import { QuickNoteModal } from '@/components/quick-note-modal'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'

const NO_SHELL_PATHS = ['/login', '/metrics/korus']

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showShell = !NO_SHELL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const [searchOpen, setSearchOpen] = useState(false)

  if (!showShell) return <>{children}</>

  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <MainContent onSearchOpen={() => setSearchOpen(true)}>
            {children}
          </MainContent>
        </div>
        <CommandPalette />
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
        <CharlieChat />
        <QuickNoteModal />
        <Toaster theme="dark" position="bottom-right" />
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
