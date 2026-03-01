import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, activityLog } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { formatRelativeDate, getWorkspaceColor } from '@/lib/utils'
import { CheckSquare, Clock, AlertCircle, BarChart2 } from 'lucide-react'
import { WORKSPACES } from '@/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace: wsParam } = await searchParams
  const workspaceId = wsParam ?? null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const weekStr = endOfWeek.toISOString().split('T')[0]

  const [allTasks, recentActivity] = await Promise.all([
    workspaceId
      ? db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId))
      : db.select().from(tasks),
    workspaceId
      ? db.select({
          id: activityLog.id,
          workspaceId: activityLog.workspaceId,
          actor: activityLog.actor,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityTitle: activityLog.entityTitle,
          description: activityLog.description,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .where(eq(activityLog.workspaceId, workspaceId))
        .orderBy(desc(activityLog.createdAt))
        .limit(20)
      : db.select({
          id: activityLog.id,
          workspaceId: activityLog.workspaceId,
          actor: activityLog.actor,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityTitle: activityLog.entityTitle,
          description: activityLog.description,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .orderBy(desc(activityLog.createdAt))
        .limit(20),
  ])

  const dueToday = allTasks.filter(t => t.dueDate === todayStr).length
  const dueThisWeek = allTasks.filter(t => t.dueDate && t.dueDate > todayStr && t.dueDate <= weekStr).length
  const overdue = allTasks.filter(t =>
    t.dueDate &&
    t.dueDate < todayStr &&
    !['Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)
  ).length

  const workspaceBreakdown = WORKSPACES.map(ws => ({
    ...ws,
    total: allTasks.filter(t => t.workspaceId === ws.id).length,
    completed: allTasks.filter(t =>
      t.workspaceId === ws.id &&
      ['Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)
    ).length,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-6">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Due Today', value: dueToday, icon: Clock, color: '#D4A017' },
          { label: 'Due This Week', value: dueThisWeek, icon: CheckSquare, color: '#008080' },
          { label: 'Overdue', value: overdue, icon: AlertCircle, color: '#EF4444' },
          { label: 'Total Tasks', value: allTasks.length, icon: BarChart2, color: '#6B7280' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-[#A0A0A0] font-medium uppercase tracking-wide">{stat.label}</p>
                <div
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}18` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#F5F5F5] font-mono tabular-nums">{stat.value}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace overview */}
        <div className="lg:col-span-1 p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-semibold text-[#F5F5F5] mb-4">Workspaces</h2>
          <div className="space-y-3">
            {workspaceBreakdown.map(ws => (
              <div key={ws.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ws.icon}</span>
                    <span className="text-sm text-[#F5F5F5]">{ws.name}</span>
                  </div>
                  <span className="text-xs text-[#6B7280] font-mono">{ws.completed}/{ws.total}</span>
                </div>
                <div className="h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: ws.total > 0 ? `${(ws.completed / ws.total) * 100}%` : '0%',
                      backgroundColor: ws.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="lg:col-span-2 p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-semibold text-[#F5F5F5] mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-[#4B5563] text-center py-8">No activity yet. Create a task to get started.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(entry => {
                const wsColor = getWorkspaceColor(entry.workspaceId)
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                      style={{ backgroundColor: wsColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F5F5F5]">
                        <span className="text-[#A0A0A0]">{entry.actor}</span>
                        {' '}{entry.action}{' '}
                        <span className="text-[#A0A0A0]">{entry.entityType}</span>
                        {entry.entityTitle && `: ${entry.entityTitle}`}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{formatRelativeDate(entry.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
