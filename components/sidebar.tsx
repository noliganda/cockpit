'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, CheckSquare, FolderOpen, Target, Zap, Users, FileText,
  Files, MessageSquare, BookOpen, BarChart2, Settings, PanelLeft, X, Kanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceSwitcher } from './workspace-switcher';
import { useSidebar } from '@/hooks/use-sidebar';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/tasks/kanban', label: 'Kanban', icon: Kanban },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/areas', label: 'Areas', icon: Target },
  { href: '/sprints', label: 'Sprints', icon: Zap },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/documents', label: 'Documents', icon: Files },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/brief', label: 'Brief', icon: BookOpen },
  { href: '/metrics', label: 'Metrics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[#2A2A2A]">
        {!collapsed && (
          <span className="text-sm font-semibold text-white tracking-wide">OPS</span>
        )}
        <button
          onClick={toggle}
          className="ml-auto rounded-md p-1.5 text-[#6B7280] hover:bg-[#222222] hover:text-white transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Workspace switcher */}
      <div className="px-2 py-2 border-b border-[#2A2A2A]">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors',
                active
                  ? 'bg-[#222222] text-white'
                  : 'text-[#A0A0A0] hover:bg-[#1A1A1A] hover:text-white'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-[#6B7280]')} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-[#2A2A2A] px-3 py-3">
          <p className="text-xs text-[#6B7280]">Ops Dashboard v3</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen border-r border-[#2A2A2A] bg-[#0F0F0F] transition-all duration-300 shrink-0',
          collapsed ? 'w-16' : 'w-70'
        )}
        style={{ width: collapsed ? 64 : 280 }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-[#2A2A2A] bg-[#0F0F0F] transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute right-3 top-3">
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-[#6B7280] hover:bg-[#222222] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
