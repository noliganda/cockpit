'use client';

import { useSidebar } from '@/components/sidebar';

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isMobile, isCollapsed } = useSidebar();

  // Mobile: no left margin, add top padding for header bar
  if (isMobile) {
    return (
      <main className="flex-1 overflow-y-auto pt-14 w-full">
        {children}
      </main>
    );
  }

  // Desktop/tablet: margin matches sidebar width
  const marginLeft = isCollapsed ? 64 : 280;

  return (
    <main
      className="flex-1 overflow-y-auto transition-all duration-200"
      style={{ marginLeft }}
    >
      {children}
    </main>
  );
}
