'use client'
import { useSidebar } from '@/hooks/use-sidebar'
import { Menu, Search, Keyboard } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface MainContentProps {
  children: ReactNode
  onSearchOpen?: () => void
}

export function MainContent({ children, onSearchOpen }: MainContentProps) {
  const { setMobileOpen } = useSidebar()
  const { workspace } = useWorkspace()
  const pathname = usePathname()

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top bar — shown on all screen sizes */}
      <div className="flex items-center h-12 px-4 border-b border-[rgba(167,155,120,0.13)] bg-[#14100C] shrink-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[#1A1510] transition-colors mr-1"
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
            className="ml-3 flex items-center gap-2 px-3 py-1.5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] text-[#7A6F55] hover:text-[#A79B78] hover:border-[rgba(167,155,120,0.22)] text-xs transition-colors"
          >
            <Search className="w-3 h-3" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[#5C5340] border border-[rgba(167,155,120,0.13)] rounded-none px-1 py-0.5 text-xs">⌘K</kbd>
          </button>
        )}
        {/* Keyboard shortcut hint */}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', metaKey: true, bubbles: true }))}
          title="Keyboard shortcuts (⌘/)"
          className="ml-2 w-7 h-7 flex items-center justify-center rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] text-[#5C5340] hover:text-[#A79B78] hover:border-[rgba(167,155,120,0.22)] transition-colors"
        >
          <Keyboard className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Content area */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
