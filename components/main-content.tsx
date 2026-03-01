'use client'
import { useSidebar } from '@/hooks/use-sidebar'
import { Menu, Search } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import type { ReactNode } from 'react'

interface MainContentProps {
  children: ReactNode
  onSearchOpen?: () => void
}

export function MainContent({ children, onSearchOpen }: MainContentProps) {
  const { setMobileOpen } = useSidebar()
  const { workspace } = useWorkspace()

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top bar — shown on all screen sizes */}
      <div className="flex items-center h-12 px-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0F0F0F] shrink-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors mr-2"
        >
          <Menu className="w-4 h-4" />
        </button>
        {/* Workspace accent line */}
        <div
          className="flex-1 h-0.5 rounded-full opacity-40"
          style={{ background: `linear-gradient(to right, ${workspace.color}, transparent)` }}
        />
        {/* Search button */}
        {onSearchOpen && (
          <button
            onClick={onSearchOpen}
            className="ml-3 flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0] hover:border-[rgba(255,255,255,0.10)] text-xs transition-colors"
          >
            <Search className="w-3 h-3" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[#4B5563] border border-[rgba(255,255,255,0.06)] rounded px-1 py-0.5 text-xs">⌘K</kbd>
          </button>
        )}
      </div>
      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
