'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckSquare, FolderOpen, Users, AlertCircle, Clock, FileText, ArrowRight, Activity } from 'lucide-react'
import { cn, getWorkspaceColor, formatRelativeDate } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import type { Task } from '@/types'

interface ActivityEntry {
  id: string
  workspaceId: string
  actor: string
  action: string
  entityType: string
  entityTitle?: string | null
  description?: string | null
  createdAt: Date
}

interface WorkspaceStats {
  id: string
  name: string
  color: string
  icon: string
  total: number
  completed: number
}

interface DashboardClientProps {
  stats: {
    openTasks: number
    activeProjects: number
    overdueItems: number
    contactCount: number
  }
  upcomingTasks: Task[]
  recentActivity: ActivityEntry[]
  workspaceBreakdown: WorkspaceStats[]
  workspaceId: string | null
}

function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div>
      <p className="text-3xl font-bold text-[#F5F5F5] font-mono tracking-tight">{time}</p>
      <p className="text-sm text-[#6B7280] mt-0.5">{date}</p>
    </div>
  )
}

export function DashboardClient({ stats, upcomingTasks, recentActivity, workspaceBreakdown, workspaceId }: DashboardClientProps) {
  const { workspace, workspaceId: wsId } = useWorkspace()

  const ws = workspaceId ?? wsId

  const STAT_CARDS = [
    {
      label: 'Open Tasks',
      value: stats.openTasks,
      icon: CheckSquare,
      color: workspace.color,
      href: '/tasks',
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderOpen,
      color: '#22C55E',
      href: '/projects',
    },
    {
      label: 'Contacts',
      value: stats.contactCount,
      icon: Users,
      color: '#3B82F6',
      href: '/crm',
    },
    {
      label: 'Overdue',
      value: stats.overdueItems,
      icon: AlertCircle,
      color: stats.overdueItems > 0 ? '#EF4444' : '#6B7280',
      href: '/tasks',
    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#F5F5F5] mb-0.5">
            <span style={{ color: workspace.color }}>{workspace.icon}</span>{' '}
            {workspace.name}
          </h1>
          <LiveClock />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/tasks?workspace=${ws}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.10)] transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            New Task
          </Link>
          <Link
            href={`/projects?workspace=${ws}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.10)] transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            New Project
          </Link>
          <Link
            href={`/notes?workspace=${ws}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.10)] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            New Note
          </Link>
          <Link
            href={`/crm?workspace=${ws}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-xs text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.10)] transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            New Contact
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_CARDS.map(stat => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={`${stat.href}?workspace=${ws}`}
              className="group p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-[#6B7280] font-medium uppercase tracking-wide">{stat.label}</p>
                <div
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${stat.color}18` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] font-mono tabular-nums">{stat.value}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-[#4B5563] group-hover:text-[#6B7280] transition-colors">
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming tasks */}
        <div className="lg:col-span-2 p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
              Upcoming — Next 7 Days
            </h2>
            <Link
              href={`/tasks?workspace=${ws}`}
              className="text-xs text-[#6B7280] hover:text-[#A0A0A0] transition-colors"
            >
              View all
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="py-8 text-center">
              <CheckSquare className="w-8 h-8 text-[#1F1F1F] mx-auto mb-2" />
              <p className="text-sm text-[#4B5563]">No upcoming tasks</p>
              <p className="text-xs text-[#4B5563] mt-0.5">You&apos;re all clear for the next 7 days.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingTasks.map(task => {
                const color = getWorkspaceColor(task.workspaceId)
                const isToday = task.dueDate === new Date().toISOString().split('T')[0]
                return (
                  <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="flex-1 text-sm text-[#F5F5F5] truncate">{task.title}</span>
                    <span className={cn('text-xs shrink-0 font-mono', isToday ? 'text-[#F59E0B]' : 'text-[#6B7280]')}>
                      {isToday ? 'Today' : task.dueDate}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column: Workspace breakdown + activity */}
        <div className="space-y-4">
          {/* Workspace breakdown */}
          <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#F5F5F5] mb-4">Workspaces</h2>
            <div className="space-y-3">
              {workspaceBreakdown.map(ws => (
                <div key={ws.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{ws.icon}</span>
                      <span className="text-xs text-[#F5F5F5]">{ws.name}</span>
                    </div>
                    <span className="text-xs text-[#6B7280] font-mono">{ws.completed}/{ws.total}</span>
                  </div>
                  <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: ws.total > 0 ? `${Math.round((ws.completed / ws.total) * 100)}%` : '0%',
                        backgroundColor: ws.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#F5F5F5] flex items-center gap-2 mb-4">
              <Activity className="w-3.5 h-3.5 text-[#6B7280]" />
              Recent Activity
            </h2>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#4B5563] text-center py-4">No activity yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map(entry => {
                  const wsColor = getWorkspaceColor(entry.workspaceId)
                  return (
                    <div key={entry.id} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: wsColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#A0A0A0] leading-snug">
                          <span className="text-[#F5F5F5]">{entry.actor}</span>
                          {' '}{entry.action}{' '}
                          <span className="text-[#6B7280]">{entry.entityType}</span>
                          {entry.entityTitle && (
                            <span className="text-[#A0A0A0]">: {entry.entityTitle}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#4B5563] mt-0.5">{formatRelativeDate(entry.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
