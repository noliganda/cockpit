'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckSquare, FolderOpen, Users, AlertCircle, Clock, FileText,
  ArrowRight, Activity, X, Plus, Star, Calendar, RefreshCw, ExternalLink,
} from 'lucide-react'
import { cn, getWorkspaceColor, formatRelativeDate } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import { WORKSPACES, type WorkspaceId } from '@/types'
import { toast } from 'sonner'
import type { Task } from '@/types'

interface CalendarEvent {
  id: string
  workspace: string
  calendarId: string
  calendarLabel: string
  title: string
  description?: string | null
  location?: string | null
  startTime: string
  endTime: string
  allDay?: boolean
  url?: string | null
}

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

interface FeaturedProject {
  id: string
  workspaceId: string
  name: string
  status?: string | null
  starred?: boolean | null
  description?: string | null
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
  featuredProjects: FeaturedProject[]
  workspaceId: string | null
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function QuickModal({ title, onClose, onSubmit, saving, children, submitLabel = 'Create' }: {
  title: string
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  saving: boolean
  children: React.ReactNode
  submitLabel?: string
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,8,6,0.7)] backdrop-blur-sm"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-sm mx-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.18)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(167,155,120,0.13)]">
          <h2 className="text-sm font-semibold text-[#E8DFCE]">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-4 space-y-3">
          {children}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-none bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-sm font-medium text-[#E8DFCE] hover:bg-[#272018] disabled:opacity-40 transition-all"
            >
              {saving ? 'Creating…' : <><Plus className="w-3.5 h-3.5" />{submitLabel}</>}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-sm text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] transition-colors'
const labelCls = 'block text-xs text-[#7A6F55] uppercase tracking-wide mb-1'

function WorkspaceSelect({ value, onChange }: { value: WorkspaceId; onChange: (v: WorkspaceId) => void }) {
  return (
    <div>
      <label className={labelCls}>Workspace</label>
      <select value={value} onChange={e => onChange(e.target.value as WorkspaceId)}
        className={`${inputCls} appearance-none`}>
        {WORKSPACES.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select>
    </div>
  )
}

function NewTaskModal({ defaultWs, onClose, onCreated }: { defaultWs: WorkspaceId; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [wsId, setWsId] = useState<WorkspaceId>(defaultWs)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), workspaceId: wsId, status: 'Backlog' }),
      })
      if (res.ok) { toast.success('Task created'); onCreated(); onClose() }
      else toast.error('Failed to create task')
    } catch { toast.error('Error') } finally { setSaving(false) }
  }

  return (
    <QuickModal title="New Task" onClose={onClose} onSubmit={handleSubmit} saving={saving} submitLabel="Create Task">
      <div>
        <label className={labelCls}>Title</label>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?" className={inputCls} required />
      </div>
      <WorkspaceSelect value={wsId} onChange={setWsId} />
    </QuickModal>
  )
}

function NewProjectModal({ defaultWs, onClose, onCreated }: { defaultWs: WorkspaceId; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [wsId, setWsId] = useState<WorkspaceId>(defaultWs)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), workspaceId: wsId, status: 'Active' }),
      })
      if (res.ok) { toast.success('Project created'); onCreated(); onClose() }
      else toast.error('Failed to create project')
    } catch { toast.error('Error') } finally { setSaving(false) }
  }

  return (
    <QuickModal title="New Project" onClose={onClose} onSubmit={handleSubmit} saving={saving} submitLabel="Create Project">
      <div>
        <label className={labelCls}>Project name</label>
        <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Project name" className={inputCls} required />
      </div>
      <WorkspaceSelect value={wsId} onChange={setWsId} />
    </QuickModal>
  )
}

// Contacts are no longer created in Cockpit: the Rolodex is a read-only view synced
// in from Twenty (Baïkal → Twenty → Cockpit). New contacts are added in the address
// book; the dashboard just links to /contacts. (Quick-add removed 2026-07-15.)

// ── Live clock ────────────────────────────────────────────────────────────────
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
      <p className="text-3xl font-bold text-[#E8DFCE] font-mono tracking-tight">{time}</p>
      <p className="text-sm text-[#7A6F55] mt-0.5">{date}</p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatEventTime(start: Date, end: Date, allDay?: boolean | null) {
  if (allDay) return 'All day'
  const startStr = new Date(start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
  const endStr = new Date(end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${startStr} – ${endStr}`
}

function formatEventDate(start: Date) {
  const d = new Date(start)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d >= today && d < tomorrow) return 'Today'
  if (d >= tomorrow && d < new Date(tomorrow.getTime() + 86400000)) return 'Tomorrow'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#7D9B5E',
  Planning: '#5F7A72',
  'On Hold': '#C9962E',
  Completed: '#7A6F55',
  Archived: '#5C5340',
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function DashboardClient({
  stats, upcomingTasks, recentActivity,
  workspaceBreakdown, featuredProjects, workspaceId,
}: DashboardClientProps) {
  const { workspace, workspaceId: wsId } = useWorkspace()
  const router = useRouter()
  const ws = (workspaceId ?? wsId) as WorkspaceId

  const [modal, setModal] = useState<'task' | 'project' | null>(null)
  const [upcomingTab, setUpcomingTab] = useState<'tasks' | 'events'>('tasks')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsFetched, setEventsFetched] = useState(false)
  const [starredProjects, setStarredProjects] = useState<Set<string>>(
    new Set(featuredProjects.filter(p => p.starred).map(p => p.id))
  )

  function refresh() { router.refresh() }

  async function fetchEvents() {
    setEventsLoading(true)
    try {
      const res = await fetch('/api/calendar/live?days=30')
      const data = await res.json() as { events?: CalendarEvent[]; error?: string }
      if (data.events) {
        setEvents(data.events)
        setEventsFetched(true)
      } else {
        toast.error(data.error ?? 'Calendar fetch failed')
      }
    } catch { toast.error('Calendar error') }
    finally { setEventsLoading(false) }
  }

  // Auto-fetch events when user switches to Events tab
  useEffect(() => {
    if (upcomingTab === 'events' && !eventsFetched && !eventsLoading) {
      void fetchEvents()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcomingTab])

  async function toggleStar(projectId: string, currentlyStarred: boolean) {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: !currentlyStarred }),
      })
      if (res.ok) {
        setStarredProjects(prev => {
          const next = new Set(prev)
          if (currentlyStarred) next.delete(projectId)
          else next.add(projectId)
          return next
        })
        toast.success(currentlyStarred ? 'Removed from featured' : 'Added to featured')
      }
    } catch { toast.error('Error') }
  }

  const STAT_CARDS = [
    { label: 'Open Tasks', value: stats.openTasks, icon: CheckSquare, color: workspace.color, href: `/tasks?workspace=${ws}&filter=active` },
    { label: 'Active Projects', value: stats.activeProjects, icon: FolderOpen, color: '#7D9B5E', href: `/projects?workspace=${ws}&status=Active` },
    { label: 'Contacts', value: stats.contactCount, icon: Users, color: '#5F7A72', href: `/contacts?workspace=${ws}` },
    { label: 'Overdue', value: stats.overdueItems, icon: AlertCircle, color: stats.overdueItems > 0 ? '#C0452E' : '#7A6F55', href: `/tasks?workspace=${ws}&filter=overdue` },
  ]

  const btnCls = 'flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] text-xs text-[#A79B78] hover:text-[#E8DFCE] hover:border-[rgba(167,155,120,0.22)] transition-colors cursor-pointer'

  return (
    <>
      {modal === 'task' && <NewTaskModal defaultWs={ws} onClose={() => setModal(null)} onCreated={refresh} />}
      {modal === 'project' && <NewProjectModal defaultWs={ws} onClose={() => setModal(null)} onCreated={refresh} />}

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-lg font-medium text-[#E8DFCE] mb-0.5 flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: workspace.color }}
              />
              {workspace.name}
            </h1>
            <LiveClock />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setModal('task')} className={btnCls}>
              <CheckSquare className="w-3.5 h-3.5" />New Task
            </button>
            <button onClick={() => setModal('project')} className={btnCls}>
              <FolderOpen className="w-3.5 h-3.5" />New Project
            </button>
            <button onClick={() => window.dispatchEvent(new Event('quick-note-open'))} className={btnCls}>
              <FileText className="w-3.5 h-3.5" />New Note
            </button>
          </div>
        </div>

        {/* Contacts are synced in from the address book — no quick-add here */}
        <p className="text-[11px] text-[#5C5340] font-mono -mt-2">
          Contacts are added in your address book and appear here within ~45 min (sync + reconcile).
        </p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map(stat => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href}
                className="group p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] hover:border-[rgba(167,155,120,0.22)] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-[#7A6F55] font-medium uppercase tracking-wide">{stat.label}</p>
                  <div className="w-7 h-7 rounded-none flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${stat.color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#E8DFCE] font-mono tabular-nums">{stat.value}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-[#5C5340] group-hover:text-[#7A6F55] transition-colors">
                  <span>View all</span><ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            )
          })}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left / main column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Upcoming — Tasks + Events */}
            <div className="rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[rgba(167,155,120,0.13)]">
                <h2 className="text-sm font-semibold text-[#E8DFCE] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#7A6F55]" />
                  Upcoming
                </h2>
                <div className="flex items-center gap-3">
                  {/* Tab toggle */}
                  <div className="flex items-center gap-1 p-0.5 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)]">
                    <button
                      onClick={() => setUpcomingTab('tasks')}
                      className={cn('px-2.5 py-1 rounded-none text-xs font-medium transition-colors',
                        upcomingTab === 'tasks'
                          ? 'bg-[#201A14] text-[#E8DFCE]'
                          : 'text-[#7A6F55] hover:text-[#A79B78]'
                      )}
                    >
                      Tasks {upcomingTasks.length > 0 && <span className="ml-1 text-[10px] opacity-60">({upcomingTasks.length})</span>}
                    </button>
                    <button
                      onClick={() => setUpcomingTab('events')}
                      className={cn('px-2.5 py-1 rounded-none text-xs font-medium transition-colors',
                        upcomingTab === 'events'
                          ? 'bg-[#201A14] text-[#E8DFCE]'
                          : 'text-[#7A6F55] hover:text-[#A79B78]'
                      )}
                    >
                      Events {events.length > 0 && <span className="ml-1 text-[10px] opacity-60">({events.length})</span>}
                    </button>
                  </div>
                  {upcomingTab === 'tasks'
                    ? <Link href={`/tasks?workspace=${ws}`} className="text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors">View all</Link>
                    : <button onClick={() => void fetchEvents()} disabled={eventsLoading} className="flex items-center gap-1 text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors disabled:opacity-40">
                        <RefreshCw className={cn('w-3 h-3', eventsLoading && 'animate-spin')} />Refresh
                      </button>
                  }
                </div>
              </div>

              <div className="p-4">
                {upcomingTab === 'tasks' ? (
                  upcomingTasks.length === 0 ? (
                    <div className="py-6 text-center">
                      <CheckSquare className="w-7 h-7 text-[#251D16] mx-auto mb-2" />
                      <p className="text-sm text-[#5C5340]">No tasks due in the next 7 days</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {upcomingTasks.map(task => {
                        const color = getWorkspaceColor(task.workspaceId)
                        const isToday = task.dueDate === new Date().toISOString().split('T')[0]
                        return (
                          <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[rgba(167,155,120,0.09)] last:border-0">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="flex-1 text-sm text-[#E8DFCE] truncate">{task.title}</span>
                            <span className={cn('text-xs shrink-0 font-mono', isToday ? 'text-[#C9962E]' : 'text-[#7A6F55]')}>
                              {isToday ? 'Today' : task.dueDate}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : (
                  eventsLoading ? (
                    <div className="py-6 text-center">
                      <RefreshCw className="w-5 h-5 text-[#5C5340] mx-auto mb-2 animate-spin" />
                      <p className="text-sm text-[#5C5340]">Fetching calendars…</p>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="py-6 text-center">
                      <Calendar className="w-7 h-7 text-[#251D16] mx-auto mb-2" />
                      <p className="text-sm text-[#5C5340]">No upcoming events found</p>
                      <button
                        onClick={() => void fetchEvents()}
                        className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Fetch from Google Calendar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {events.map(event => {
                        const COLOR_MAP: Record<string, string> = { 'byron-film': '#C99A1F', korus: '#3E7A70', personal: '#C96F2E' }
                        const dotColor = COLOR_MAP[event.workspace] ?? '#7A6F55'
                        return (
                          <div key={event.id} className="flex items-start gap-3 py-2 border-b border-[rgba(167,155,120,0.09)] last:border-0">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: dotColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#E8DFCE] truncate">{event.title}</p>
                              <p className="text-[10px] text-[#5C5340] mt-0.5">{event.calendarLabel}{event.location ? ` · ${event.location}` : ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-[#C9962E] font-mono">{formatEventDate(new Date(event.startTime))}</p>
                              <p className="text-[10px] text-[#7A6F55]">{formatEventTime(new Date(event.startTime), new Date(event.endTime), event.allDay)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Workspace task progress */}
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <h2 className="text-sm font-semibold text-[#E8DFCE] mb-1">Task Progress by Workspace</h2>
              <p className="text-xs text-[#7A6F55] mb-4">Tasks completed vs total across all workspaces</p>
              <div className="space-y-3">
                {workspaceBreakdown.map(wsBk => (
                  <div key={wsBk.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{wsBk.icon}</span>
                        <span className="text-xs text-[#E8DFCE]">{wsBk.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#7A6F55]">{wsBk.completed} done</span>
                        <span className="text-xs text-[#5C5340] font-mono">{wsBk.total} total</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(167,155,120,0.13)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: wsBk.total > 0 ? `${Math.round((wsBk.completed / wsBk.total) * 100)}%` : '0%',
                          backgroundColor: wsBk.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Featured Projects */}
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#E8DFCE] flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-[#C99A1F]" />
                  Projects
                </h2>
                <Link href={`/projects?workspace=${ws}`}
                  className="text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors">
                  View all
                </Link>
              </div>

              {featuredProjects.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-[#5C5340]">No active projects</p>
                  <button onClick={() => setModal('project')}
                    className="mt-2 text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors">
                    + New Project
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {featuredProjects.map(proj => {
                    const color = getWorkspaceColor(proj.workspaceId)
                    const isStarred = starredProjects.has(proj.id)
                    return (
                      <div key={proj.id} className="group flex items-center gap-2 py-1.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <Link href={`/projects?workspace=${proj.workspaceId}`}
                          className="flex-1 min-w-0 text-sm text-[#E8DFCE] truncate hover:text-[#A79B78] transition-colors">
                          {proj.name}
                        </Link>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            color: STATUS_COLORS[proj.status ?? 'Planning'] ?? '#7A6F55',
                            backgroundColor: `${STATUS_COLORS[proj.status ?? 'Planning'] ?? '#7A6F55'}18`,
                          }}
                        >
                          {proj.status ?? 'Planning'}
                        </span>
                        <button
                          onClick={() => toggleStar(proj.id, isStarred)}
                          className={cn(
                            'p-0.5 rounded-none transition-colors opacity-0 group-hover:opacity-100',
                            isStarred ? 'text-[#C99A1F] opacity-100' : 'text-[#5C5340] hover:text-[#C99A1F]'
                          )}
                          title={isStarred ? 'Remove from featured' : 'Add to featured'}
                        >
                          <Star className="w-3 h-3" fill={isStarred ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#E8DFCE] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#7A6F55]" />
                  Recent Activity
                </h2>
                <Link href="/logs"
                  className="flex items-center gap-1 text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors">
                  View all <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <p className="text-xs text-[#5C5340] text-center py-4">No activity yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {recentActivity.slice(0, 8).map(entry => {
                    const wsColor = getWorkspaceColor(entry.workspaceId)
                    return (
                      <div key={entry.id} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: wsColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#A79B78] leading-snug">
                            <span className="text-[#E8DFCE]">{entry.actor}</span>
                            {' '}{entry.action}{' '}
                            <span className="text-[#7A6F55]">{entry.entityType}</span>
                            {entry.entityTitle && <span className="text-[#A79B78]">: {entry.entityTitle}</span>}
                          </p>
                          <p className="text-[10px] text-[#5C5340] mt-0.5">{formatRelativeDate(entry.createdAt)}</p>
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
    </>
  )
}
