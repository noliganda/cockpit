'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import { WORKSPACES, type Task, type Sprint } from '@/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Milestone {
  id: string
  projectId: string
  title: string
  date?: string | null
  status?: string | null
}

interface CalendarClientProps {
  initialTasks: Task[]
  initialMilestones: Milestone[]
  initialSprints: Sprint[]
  workspaceId: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function getWorkspaceColor(id: string) {
  return WORKSPACES.find(w => w.id === id)?.color ?? '#6B7280'
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function dateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getWeekStart(d: Date) {
  const day = new Date(d)
  day.setDate(d.getDate() - d.getDay())
  day.setHours(0, 0, 0, 0)
  return day
}

export function CalendarClient({ initialTasks, initialMilestones, initialSprints, workspaceId }: CalendarClientProps) {
  const { workspace } = useWorkspace()
  const router = useRouter()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [view, setView] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState(new Date(today))
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [saving, setSaving] = useState(false)

  // Month grid
  const monthStart = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate])
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate])
  const firstDayOfWeek = monthStart.getDay()

  // Week days
  const weekDays = useMemo(() => {
    const start = getWeekStart(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [currentDate])

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (view === 'month') {
      d.setMonth(d.getMonth() + dir)
    } else {
      d.setDate(d.getDate() + dir * 7)
    }
    setCurrentDate(d)
  }

  function goToToday() {
    setCurrentDate(new Date(today))
  }

  function getTasksForDay(d: Date) {
    const ds = dateStr(d)
    return tasks.filter(t => t.dueDate === ds)
  }

  function getMilestonesForDay(d: Date) {
    const ds = dateStr(d)
    return initialMilestones.filter(m => m.date === ds)
  }

  function getSprintsForDay(d: Date) {
    const ds = dateStr(d)
    return initialSprints.filter(s => s.startDate && s.endDate && s.startDate <= ds && s.endDate >= ds)
  }

  function openCreate(day: Date) {
    setSelectedDay(day)
    setNewTaskDate(dateStr(day))
    setNewTaskTitle('')
    setCreatingTask(true)
  }

  async function createTask() {
    if (!newTaskTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          title: newTaskTitle.trim(),
          dueDate: newTaskDate || undefined,
          status: 'To Do',
        }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setTasks(prev => [created, ...prev])
      setCreatingTask(false)
      setNewTaskTitle('')
      toast.success('Task created')
      router.refresh()
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  // Build month grid cells
  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDayOfWeek + 1
    if (dayNum < 1 || dayNum > daysInMonth) return null
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum)
    return d
  })

  const headerLabel = view === 'month'
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : (() => {
        const start = weekDays[0]
        const end = weekDays[6]
        if (start.getMonth() === end.getMonth()) {
          return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
        }
        return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
      })()

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <Calendar className="w-4 h-4 text-[#6B7280]" />
        <h1 className="text-base font-semibold text-[#F5F5F5]">Calendar</h1>
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex rounded-[6px] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                view === v
                  ? 'bg-[#1A1A1A] text-[#F5F5F5]'
                  : 'text-[#6B7280] hover:text-[#A0A0A0]'
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 h-8 text-xs font-medium text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] rounded-[6px] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-sm font-medium text-[#F5F5F5] min-w-[180px] text-right hidden sm:block">{headerLabel}</span>
      </div>

      {/* Hint bar */}
      <div className="px-4 md:px-6 py-2 border-b border-[rgba(255,255,255,0.04)] text-[10px] text-[#4B5563] flex items-center gap-3">
        <span>Only tasks with a due date appear on the calendar.</span>
        <span className="hidden sm:inline">Click a day to create a dated task.</span>
        <span className="ml-auto tabular-nums">{tasks.filter(t => t.dueDate).length} dated / {tasks.length} total</span>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-y-auto">
        {view === 'month' ? (
          <MonthView
            cells={cells}
            today={today}
            getTasksForDay={getTasksForDay}
            getMilestonesForDay={getMilestonesForDay}
            getSprintsForDay={getSprintsForDay}
            onDayClick={openCreate}
            workspaceColor={workspace.color}
          />
        ) : (
          <WeekView
            weekDays={weekDays}
            today={today}
            getTasksForDay={getTasksForDay}
            getMilestonesForDay={getMilestonesForDay}
            getSprintsForDay={getSprintsForDay}
            onDayClick={openCreate}
            workspaceColor={workspace.color}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 md:px-6 py-3 border-t border-[rgba(255,255,255,0.06)] shrink-0 overflow-x-auto">
        {WORKSPACES.map(ws => (
          <div key={ws.id} className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
            <span className="text-xs text-[#6B7280]">{ws.icon} {ws.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-2 h-2 rotate-45 bg-[#A0A0A0]" />
          <span className="text-xs text-[#6B7280]">Milestone</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-4 h-1.5 rounded-full bg-[rgba(255,255,255,0.15)]" />
          <span className="text-xs text-[#6B7280]">Sprint</span>
        </div>
      </div>

      {/* Create task modal */}
      {creatingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCreatingTask(false)} />
          <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-4">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-3">
              New Task — {selectedDay ? selectedDay.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
            </h3>
            <input
              autoFocus
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTask(); if (e.key === 'Escape') setCreatingTask(false) }}
              placeholder="Task title..."
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none placeholder-[#4B5563] focus:border-[rgba(255,255,255,0.16)] mb-3"
            />
            <input
              type="date"
              value={newTaskDate}
              onChange={e => setNewTaskDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCreatingTask(false)}
                className="px-3 py-1.5 rounded-[6px] text-xs text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={saving || !newTaskTitle.trim()}
                className="px-3 py-1.5 rounded-[6px] text-xs font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] disabled:opacity-40 transition-colors"
                style={{ borderColor: workspace.color + '40' }}
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Month View ---
interface DayViewProps {
  cells: (Date | null)[]
  today: Date
  getTasksForDay: (d: Date) => Task[]
  getMilestonesForDay: (d: Date) => { id: string; title: string }[]
  getSprintsForDay: (d: Date) => Sprint[]
  onDayClick: (d: Date) => void
  workspaceColor: string
}

function MonthView({ cells, today, getTasksForDay, getMilestonesForDay, getSprintsForDay, onDayClick }: DayViewProps) {
  return (
    <div className="p-2 md:p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center py-2 text-xs font-medium text-[#4B5563] uppercase tracking-wide">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d[0]}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-[rgba(255,255,255,0.04)] rounded-[8px] overflow-hidden border border-[rgba(255,255,255,0.04)]">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={i} className="bg-[#0A0A0A] min-h-[80px] md:min-h-[100px]" />
          }
          const isToday = isSameDay(day, today)
          const dayTasks = getTasksForDay(day)
          const dayMilestones = getMilestonesForDay(day)
          const daySprints = getSprintsForDay(day)
          const isPast = day < today && !isToday

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                'bg-[#0F0F0F] min-h-[80px] md:min-h-[100px] p-1.5 cursor-pointer group transition-colors hover:bg-[#141414]',
                isPast && 'opacity-60'
              )}
            >
              {/* Sprint bar at top */}
              {daySprints.length > 0 && (
                <div className="h-0.5 rounded-full mb-1 bg-[rgba(255,255,255,0.15)]" title={daySprints[0].name} />
              )}

              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    isToday
                      ? 'text-[#0F0F0F] font-bold'
                      : 'text-[#6B7280] group-hover:text-[#A0A0A0]'
                  )}
                  style={isToday ? { backgroundColor: '#F5F5F5' } : undefined}
                >
                  {day.getDate()}
                </span>
                <Plus className="w-3 h-3 text-[#4B5563] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Milestones — diamond markers */}
              {dayMilestones.slice(0, 1).map(m => (
                <div key={m.id} className="flex items-center gap-1 mb-0.5">
                  <div className="w-2 h-2 rotate-45 bg-[#A0A0A0] shrink-0" />
                  <span className="text-[10px] text-[#A0A0A0] truncate hidden md:block">{m.title}</span>
                </div>
              ))}

              {/* Task dots */}
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {dayTasks.slice(0, 5).map(t => (
                  <div
                    key={t.id}
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: getWorkspaceColor(t.workspaceId) }}
                    title={t.title}
                  />
                ))}
                {dayTasks.length > 5 && (
                  <span className="text-[9px] text-[#4B5563]">+{dayTasks.length - 5}</span>
                )}
              </div>

              {/* Task labels on md+ */}
              <div className="hidden md:block space-y-0.5 mt-1">
                {dayTasks.slice(0, 2).map(t => (
                  <div
                    key={t.id}
                    className="text-[10px] leading-tight truncate px-1 rounded"
                    style={{ color: getWorkspaceColor(t.workspaceId), backgroundColor: getWorkspaceColor(t.workspaceId) + '18' }}
                  >
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-[10px] text-[#4B5563]">+{dayTasks.length - 2} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Week View ---
interface WeekViewProps {
  weekDays: Date[]
  today: Date
  getTasksForDay: (d: Date) => Task[]
  getMilestonesForDay: (d: Date) => { id: string; title: string }[]
  getSprintsForDay: (d: Date) => Sprint[]
  onDayClick: (d: Date) => void
  workspaceColor: string
}

function WeekView({ weekDays, today, getTasksForDay, getMilestonesForDay, getSprintsForDay, onDayClick }: WeekViewProps) {
  return (
    <div className="p-2 md:p-4">
      <div className="grid grid-cols-7 gap-px bg-[rgba(255,255,255,0.04)] rounded-[8px] overflow-hidden border border-[rgba(255,255,255,0.04)]">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          const dayTasks = getTasksForDay(day)
          const dayMilestones = getMilestonesForDay(day)
          const daySprints = getSprintsForDay(day)
          const isPast = day < today && !isToday

          return (
            <div
              key={i}
              className={cn(
                'bg-[#0F0F0F] min-h-[400px] flex flex-col cursor-pointer hover:bg-[#141414] transition-colors group',
                isPast && 'opacity-70'
              )}
              onClick={() => onDayClick(day)}
            >
              {/* Day header */}
              <div className={cn(
                'p-2 border-b border-[rgba(255,255,255,0.04)] text-center',
                isToday && 'bg-[#1A1A1A]'
              )}>
                <div className="text-[10px] uppercase font-medium text-[#4B5563] mb-0.5">
                  {DAYS[day.getDay()]}
                </div>
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-semibold',
                    isToday ? 'text-[#0F0F0F]' : 'text-[#A0A0A0]'
                  )}
                  style={isToday ? { backgroundColor: '#F5F5F5' } : undefined}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Sprint indicator */}
              {daySprints.length > 0 && (
                <div className="mx-2 mt-1">
                  <div
                    className="h-1 rounded-full bg-[rgba(255,255,255,0.12)] text-[9px] text-[#6B7280] px-1 flex items-center truncate"
                    title={daySprints[0].name}
                  />
                </div>
              )}

              {/* Day content */}
              <div className="flex-1 p-1.5 space-y-1">
                {/* Milestones */}
                {dayMilestones.map(m => (
                  <div key={m.id} className="flex items-center gap-1 px-1 py-0.5 rounded bg-[rgba(255,255,255,0.04)]">
                    <div className="w-2 h-2 rotate-45 bg-[#A0A0A0] shrink-0" />
                    <span className="text-[10px] text-[#A0A0A0] truncate">{m.title}</span>
                  </div>
                ))}

                {/* Tasks */}
                {dayTasks.map(t => (
                  <div
                    key={t.id}
                    className="px-1.5 py-1 rounded-[4px] text-[10px] font-medium truncate"
                    style={{
                      backgroundColor: getWorkspaceColor(t.workspaceId) + '20',
                      color: getWorkspaceColor(t.workspaceId),
                    }}
                    onClick={e => e.stopPropagation()}
                    title={t.title}
                  >
                    {t.title}
                  </div>
                ))}

                {/* Add prompt */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 px-1 py-0.5 text-[10px] text-[#4B5563]">
                    <Plus className="w-3 h-3" />
                    <span>Add task</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
