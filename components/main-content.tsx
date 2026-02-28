'use client';

import { useSidebar } from '@/components/sidebar';
import { NotionSyncButton } from '@/components/notion-sync-button';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isMobile, isCollapsed } = useSidebar();

  // Mobile: no left margin, add top padding for header bar
  if (isMobile) {
    return (
      <main className="flex-1 overflow-y-auto pt-14 w-full relative">
        <div className="fixed top-2 right-3 z-50">
          <NotionSyncButton />
        </div>
        {children}
      </main>
    );
  }

  // Desktop/tablet: margin matches sidebar width
  const marginLeft = isCollapsed ? 64 : 280;

  return (
    <main
      className="flex-1 overflow-y-auto transition-all duration-200 relative"
      style={{ marginLeft }}
    >
      <div className="fixed top-3 right-4 z-50">
        <NotionSyncButton />
      </div>
      {children}
    </main>
  );
}
