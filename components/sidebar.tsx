'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, CheckSquare, Kanban, Grid2X2, FolderOpen, Layout, Zap,
  Users, FileText, Database, FolderArchive, MessageSquare, Newspaper,
  BarChart2, Settings, ChevronLeft, Menu, X, CalendarDays, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import { useSidebar } from '@/hooks/use-sidebar'
import { WorkspaceSwitcher } from './workspace-switcher'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Home', indent: false },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks', indent: false },
  { href: '/tasks/kanban', icon: Kanban, label: 'Kanban', indent: true },
  { href: '/tasks/matrix', icon: Grid2X2, label: 'Matrix', indent: true },
  { href: '/tasks/calendar', icon: CalendarDays, label: 'Calendar', indent: true },
  { href: '/tasks/priority', icon: Zap, label: 'Priority Engine', indent: true },
  { href: '/projects', icon: FolderOpen, label: 'Projects', indent: false },
  { href: '/areas', icon: Layout, label: 'Areas', indent: false },
  { href: '/sprints', icon: Zap, label: 'Sprints', indent: false },
  { href: '/crm', icon: Users, label: 'Contacts', indent: false },
  { href: '/notes', icon: FileText, label: 'Notes', indent: false },
  { href: '/bases', icon: Database, label: 'Bases', indent: false },
  { href: '/documents', icon: FolderArchive, label: 'Documents', indent: false },
  { href: '/messages', icon: MessageSquare, label: 'Messages', indent: false },
  { href: '/brief', icon: Newspaper, label: 'Brief', indent: false },
  { href: '/logs', icon: Activity, label: 'Logs', indent: false },
  { href: '/metrics', icon: BarChart2, label: 'Metrics', indent: false },
  { href: '/ai-metrics', icon: Zap, label: 'AI Metrics', indent: true },
  { href: '/metrics/productivity', icon: BarChart2, label: 'Productivity', indent: true },
  { href: '/settings', icon: Settings, label: 'Settings', indent: false },
] as const

interface SidebarInnerProps {
  onClose?: () => void
}

function SidebarInner({ onClose }: SidebarInnerProps) {
  const pathname = usePathname()
  const { workspace, workspaceId } = useWorkspace()
  const { collapsed, toggleCollapsed } = useSidebar()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    // Exact match for parent routes that have subroutes in the nav
    if (href === '/tasks') return pathname === '/tasks'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[#0F0F0F] border-r border-[rgba(255,255,255,0.06)] transition-all duration-300',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.06)]">
        {!collapsed && (
          <div className="flex-1 min-w-0 mr-2">
            <WorkspaceSwitcher />
          </div>
        )}
        <button
          onClick={onClose ?? toggleCollapsed}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#141414] text-[#6B7280] hover:text-[#F5F5F5] transition-colors shrink-0"
        >
          {onClose ? <X className="w-4 h-4" /> : collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={`${item.href}?workspace=${workspaceId}`}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[6px] h-8 transition-colors relative group',
                    item.indent ? 'pl-8' : 'px-2',
                    active
                      ? 'bg-[#1A1A1A] text-[#F5F5F5]'
                      : 'text-[#6B7280] hover:bg-[#141414] hover:text-[#A0A0A0]'
                  )}
                  style={active ? {
                    borderLeft: `2px solid ${workspace.color}`,
                    paddingLeft: collapsed ? '13px' : item.indent ? '30px' : '6px',
                  } : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[#222222] border border-[rgba(255,255,255,0.10)] rounded-[6px] text-xs text-[#F5F5F5] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-[#4B5563]">OPS Dashboard v4</p>
          <p className="text-xs text-[#4B5563] mt-0.5">{new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <SidebarInner />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex h-full">
            <SidebarInner onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
