'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CheckSquare,
  FolderOpen,
  Layers,
  Users,
  FileText,
  MessageSquare,
  Sun,
  Settings,
  DollarSign,
  BarChart2,
  Timer,
  Zap,
  NotebookPen,
} from 'lucide-react';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useAuth } from '@/components/auth-provider';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/areas', label: 'Areas', icon: Layers },
  { href: '/sprints', label: 'Sprints', icon: Timer },
  { href: '/crm', label: 'CRM', icon: Users },
  { href: '/metrics', label: 'Metrics', icon: BarChart2 },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/brief', label: 'Morning Brief', icon: Sun },
  { href: '/costs', label: 'Costs', icon: DollarSign },
];

const BOTTOM_ITEMS: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const { logout } = useAuth();

  const accentColor = getWorkspaceColor(workspace.id);

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col z-30">
      {/* Header / Brand */}
      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentColor }}>
            <Zap className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-white text-sm tracking-wide">OPS DASHBOARD</span>
        </div>
        <WorkspaceSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg"
                      style={{ background: `${accentColor}15` }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <div
                    className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <span style={isActive ? { color: accentColor } : undefined}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: accentColor, color: '#0F0F0F' }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                        style={{ background: accentColor }}
                      />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Items */}
      <div className="p-3 border-t border-[#2A2A2A]">
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-white bg-[#2A2A2A]'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
        {/* Workspace indicator + logout */}
        <div className="mt-3 px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
            <span className="text-xs text-[#A0A0A0]">{workspace.name}</span>
          </div>
          <button
            onClick={logout}
            title="Lock workspace"
            className="text-[#6B7280] hover:text-[#EF4444] transition-colors p-1 rounded"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
