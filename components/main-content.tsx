'use client';

import { type ReactNode } from 'react';
import { NotionSyncButton } from './notion-sync-button';
import { CommandPalette } from './command-palette';
import { SearchBar } from './search-bar';
import { CharlieChat } from './charlie-chat';

export function MainContent({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-end gap-2 px-4 py-2 border-b border-[#2A2A2A] bg-[#0F0F0F]/90 backdrop-blur-sm">
        <span className="text-xs text-[#6B7280] mr-auto hidden sm:block">
          <kbd className="border border-[#2A2A2A] rounded px-1 py-0.5">⌘K</kbd>
          <span className="ml-1">command palette</span>
        </span>
        <SearchBar />
        <NotionSyncButton />
      </div>

      {/* Page content */}
      <div className="p-4 md:p-6">
        {children}
      </div>

      <CommandPalette />
      <CharlieChat />
    </main>
  );
}
