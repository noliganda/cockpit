'use client'
import { useSidebar } from '@/hooks/use-sidebar'
import { Menu } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import type { ReactNode } from 'react'

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { setMobileOpen } = useSidebar()
  const { workspace } = useWorkspace()

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center h-12 px-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0F0F0F]">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#141414] transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div
          className="ml-2 flex-1 h-0.5 rounded-full opacity-60"
          style={{ background: `linear-gradient(to right, ${workspace.color}, transparent)` }}
        />
      </div>

      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
