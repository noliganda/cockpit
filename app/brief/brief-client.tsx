'use client'
import { useState, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import { RefreshCw, Zap, Calendar, FolderOpen, Clock, AlertTriangle, Star } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'

const WS_COLORS: Record<string, string> = {
  'byron-film': '#D4A017',
  'korus': '#008080',
  'personal': '#F97316',
}
const WS_LABELS: Record<string, string> = {
  'byron-film': 'Byron Film',
  'korus': 'KORUS',
  'personal': 'Personal',
}

function wsColor(id: string | null) {
  return WS_COLORS[id ?? ''] ?? '#6B7280'
}
function wsLabel(id: string | null) {
  return WS_LABELS[id ?? ''] ?? id ?? '—'
}

function WorkspacePill({ workspaceId }: { workspaceId: string | null }) {
  const color = wsColor(workspaceId)
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: `${color}22`, color }}
    >
      {wsLabel(workspaceId)}
    </span>
  )
}

interface BriefData {
  id: string
  content: string
  generated_at: string
  generated_by: string
}

interface TaskItem {
  id: string
  title: string
  status: string
  dueDate: string | null
  urgent: boolean
  important: boolean
  workspaceId: string | null
}

interface ProjectItem {
  id: string
  name: string
  status: string | null
  endDate: string | null
  starred: boolean
  workspaceId: string | null
}

interface CalendarEvent {
  title: string
  startTime: string
  endTime: string | null
  workspaceId: string | null
}

interface Stats {
  openTasks: number
  overdueCount: number
  dueTodayCount: number
  dueThisWeek: number
  activeProjectCount: number
}

interface BriefClientProps {
  workspaceId: string | null
  latestBrief: BriefData | null
  criticalTasks: TaskItem[]
  activeProjects: ProjectItem[]
  calendarEvents: CalendarEvent[]
  stats: Stats
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return iso
  }
}

function formatDate(iso: string | null) {
  if (!iso) return null
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  try {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false
  return dueDate < new Date().toISOString().split('T')[0]
}

export function BriefClient({
  workspaceId,
  latestBrief,
  criticalTasks,
  activeProjects,
  calendarEvents,
  stats,
}: BriefClientProps) {
  const { workspace } = useWorkspace()
  const [brief, setBrief] = useState<BriefData | null>(latestBrief)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const dayLabel = today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/brief/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId }),
        })
        if (!res.ok) throw new Error('Failed to generate brief')
        const data = await res.json()
        setBrief(data.brief)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error generating brief')
      }
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-widest font-medium mb-1">{dayLabel}</p>
            <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Morning Brief</h1>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-sm font-medium transition-all disabled:opacity-50"
            style={{
              background: `${workspace.color}18`,
              color: workspace.color,
              border: `1px solid ${workspace.color}30`,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            {isPending ? 'Generating…' : 'Generate Brief'}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {stats.overdueCount > 0 && (
            <StatPill icon={<AlertTriangle className="w-3 h-3" />} label={`${stats.overdueCount} overdue`} color="#EF4444" />
          )}
          <StatPill icon={<Zap className="w-3 h-3" />} label={`${stats.openTasks} open tasks`} color={workspace.color} />
          {stats.dueTodayCount > 0 && (
            <StatPill icon={<Clock className="w-3 h-3" />} label={`${stats.dueTodayCount} due today`} color="#F59E0B" />
          )}
          <StatPill icon={<FolderOpen className="w-3 h-3" />} label={`${stats.activeProjectCount} active projects`} color="#6B7280" />
          {calendarEvents.length > 0 && (
            <StatPill icon={<Calendar className="w-3 h-3" />} label={`${calendarEvents.length} events today`} color="#8B5CF6" />
          )}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* AI Brief Card */}
        <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#141414] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: workspace.color }} />
              <span className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-widest">Charlie&apos;s Brief</span>
            </div>
            {brief?.generated_at && (
              <span className="text-xs text-[#4B5563]">
                {new Date(brief.generated_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {' '}&middot;{' '}
                {new Date(brief.generated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            {error && (
              <p className="text-sm text-red-400 mb-3">{error}</p>
            )}
            {isPending ? (
              <div className="space-y-2">
                {[80, 95, 70, 85, 60].map((w, i) => (
                  <div key={i} className="h-3 rounded-full bg-[#222222] animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : brief ? (
              <div className="prose-brief text-[#D1D5DB] text-sm leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="text-[#F5F5F5] font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-[#6B7280] shrink-0" />
                        <span>{children}</span>
                      </li>
                    ),
                    em: ({ children }) => <em className="text-[#9CA3AF] not-italic">{children}</em>,
                  }}
                >
                  {brief.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-[#4B5563] text-sm mb-3">No brief generated yet.</p>
                <button
                  onClick={handleGenerate}
                  className="text-sm font-medium px-4 py-2 rounded-[8px] transition-all"
                  style={{
                    background: `${workspace.color}18`,
                    color: workspace.color,
                    border: `1px solid ${workspace.color}30`,
                  }}
                >
                  Generate first brief
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Today's Calendar */}
          <DataCard
            icon={<Calendar className="w-4 h-4" />}
            title="Today's Calendar"
            accentColor="#8B5CF6"
            empty={calendarEvents.length === 0}
            emptyText="No events synced"
          >
            {calendarEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <span
                  className="text-xs font-mono text-[#8B5CF6] mt-0.5 shrink-0 w-14 text-right"
                >
                  {formatTime(ev.startTime)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E5E7EB] font-medium truncate">{ev.title}</p>
                  {ev.workspaceId && <WorkspacePill workspaceId={ev.workspaceId} />}
                </div>
              </div>
            ))}
          </DataCard>

          {/* Critical Tasks */}
          <DataCard
            icon={<Zap className="w-4 h-4" />}
            title="Needs Attention"
            accentColor="#EF4444"
            empty={criticalTasks.length === 0}
            emptyText="Nothing critical 🎉"
          >
            {criticalTasks.map(task => {
              const overdue = isOverdue(task.dueDate)
              return (
                <div key={task.id} className="py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <p className="text-sm text-[#E5E7EB] leading-snug truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.workspaceId && <WorkspacePill workspaceId={task.workspaceId} />}
                        {task.dueDate && (
                          <span className={`text-[10px] font-medium ${overdue ? 'text-red-400' : 'text-[#6B7280]'}`}>
                            {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.urgent && (
                          <span className="text-[10px] font-semibold text-amber-400">URGENT</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </DataCard>

          {/* Active Projects */}
          <DataCard
            icon={<FolderOpen className="w-4 h-4" />}
            title="Active Projects"
            accentColor={workspace.color}
            empty={activeProjects.length === 0}
            emptyText="No active projects"
          >
            {activeProjects.map(proj => (
              <div key={proj.id} className="py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {proj.starred && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                      <p className="text-sm text-[#E5E7EB] font-medium truncate">{proj.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {proj.workspaceId && <WorkspacePill workspaceId={proj.workspaceId} />}
                      {proj.endDate && (
                        <span className="text-[10px] text-[#6B7280]">{formatDate(proj.endDate)}</span>
                      )}
                      {proj.status && (
                        <span className="text-[10px] text-[#4B5563]">{proj.status}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </DataCard>
        </div>
      </div>
    </div>
  )
}

function StatPill({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode
  label: string
  color: string
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: `${color}15`, color }}
    >
      {icon}
      {label}
    </div>
  )
}

function DataCard({
  icon,
  title,
  accentColor,
  children,
  empty,
  emptyText,
}: {
  icon: React.ReactNode
  title: string
  accentColor: string
  children: React.ReactNode
  empty: boolean
  emptyText: string
}) {
  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#141414] overflow-hidden">
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.06)]"
        style={{ borderTopColor: accentColor }}
      >
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-4 py-1 max-h-72 overflow-y-auto">
        {empty ? (
          <p className="text-sm text-[#4B5563] text-center py-6">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
