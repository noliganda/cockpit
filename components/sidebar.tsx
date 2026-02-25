'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, createContext, useContext } from 'react';
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
  Search,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkspaceSwitcher } from '@/components/workspace-switcher';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useAuth } from '@/components/auth-provider';

// ─── Sidebar context for layout coordination ─────────────────────────────────

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  isMobile: boolean;
  toggle: () => void;
  close: () => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isCollapsed: false,
  isMobile: false,
  toggle: () => {},
  close: () => {},
  toggleCollapse: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
        setIsOpen(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        isMobile,
        toggle: () => setIsOpen((v) => !v),
        close: () => setIsOpen(false),
        toggleCollapse: () => setIsCollapsed((v) => !v),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ─── Mobile header bar ───────────────────────────────────────────────────────

export function MobileHeader() {
  const { isMobile, toggle } = useSidebar();
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  if (!isMobile) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-[#1A1A1A] border-b border-[#2A2A2A] flex items-center justify-between px-4 z-40">
      <button onClick={toggle} className="text-white p-1">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: accentColor }}
        >
          <Zap className="w-3 h-3 text-black" />
        </div>
        <span className="font-bold text-white text-xs tracking-wide">OPS DASHBOARD</span>
      </div>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('cmd-palette-open'))}
        className="text-[#6B7280] p-1"
      >
        <Search className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Nav items ───────────────────────────────────────────────────────────────

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

// ─── Sidebar component ──────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const { logout } = useAuth();
  const { isOpen, isCollapsed, isMobile, close, toggleCollapse } = useSidebar();

  const accentColor = getWorkspaceColor(workspace.id);
  const collapsed = !isMobile && isCollapsed;
  const sidebarWidth = collapsed ? 64 : 280;

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebarContent = (
    <aside
      className={`h-full bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col transition-all duration-200 ${
        isMobile ? 'w-[280px]' : ''
      }`}
      style={!isMobile ? { width: sidebarWidth } : undefined}
    >
      {/* Header */}
      <div className={`border-b border-[#2A2A2A] ${collapsed ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 mb-4'}`}>
          {isMobile && (
            <button onClick={close} className="text-[#6B7280] hover:text-white mr-2">
              <X className="w-5 h-5" />
            </button>
          )}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: accentColor }}
          >
            <Zap className="w-4 h-4 text-black" />
          </div>
          {!collapsed && (
            <span className="font-bold text-white text-sm tracking-wide">OPS DASHBOARD</span>
          )}
        </div>
        {!collapsed && (
          <>
            <WorkspaceSwitcher />
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('cmd-palette-open'))}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] text-[#6B7280] hover:text-white hover:border-[#3A3A3A] transition-colors text-xs"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left">Search…</span>
              <span className="flex items-center gap-0.5 font-mono text-[10px] text-[#4A4A4A]">
                <kbd className="bg-[#1A1A1A] px-1 rounded">⌘</kbd>
                <kbd className="bg-[#1A1A1A] px-1 rounded">K</kbd>
              </span>
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-1.5' : 'p-3'}`}>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}>
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
                    className={`relative flex items-center ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                    } rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <span style={isActive ? { color: accentColor } : undefined}>
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span
                        className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: accentColor, color: '#0F0F0F' }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && !collapsed && (
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

      {/* Bottom */}
      <div className={`border-t border-[#2A2A2A] ${collapsed ? 'p-1.5' : 'p-3'}`}>
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}>
              <div
                className={`flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                } rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'text-white bg-[#2A2A2A]'
                    : 'text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}

        {/* Collapse toggle (desktop/tablet only) */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className={`mt-2 w-full flex items-center ${
              collapsed ? 'justify-center' : 'gap-3 px-3'
            } py-2 rounded-lg text-xs text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}

        {/* Workspace indicator + logout */}
        {!collapsed && (
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
        )}
        {collapsed && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={logout}
              title="Lock workspace"
              className="text-[#6B7280] hover:text-[#EF4444] transition-colors p-1 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-black/60 z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 h-full z-50"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop/tablet: fixed sidebar
  return (
    <div
      className="fixed left-0 top-0 h-full z-30 transition-all duration-200"
      style={{ width: sidebarWidth }}
    >
      {sidebarContent}
    </div>
  );
}
