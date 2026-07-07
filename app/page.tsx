import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { tasks, projects, briefs, commItems } from '@/lib/db/schema'
import { desc, eq, gte, isNull } from 'drizzle-orm'
import { toNormalized } from '@/lib/task-lifecycle'
import { AlertTriangle, PenLine, Inbox, ArrowRight, Newspaper } from 'lucide-react'
import { BriefMarkdown } from './home-brief-markdown'

export const dynamic = 'force-dynamic'

const DONE_STATUSES = ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid', 'Lost']

const WS_COLORS: Record<string, string> = {
  'byron-film': '#C99A1F',
  korus: '#3E7A70',
  personal: '#C96F2E',
}
const WS_LABELS: Record<string, string> = {
  'byron-film': 'Byron Film',
  korus: 'KORUS',
  personal: 'Personal',
}

const SIGNAL_STYLES: Record<string, { color: string; label: string }> = {
  on_track: { color: '#7D9B5E', label: 'On track' },
  ready_for_review: { color: '#5F7A72', label: 'Nearly done' },
  at_risk: { color: '#C9962E', label: 'At risk' },
  blocked: { color: '#C0452E', label: 'Blocked' },
  all_done: { color: '#7A6F55', label: 'All done' },
  no_tasks: { color: '#5C5340', label: 'No open tasks' },
}

function WorkspacePill({ workspaceId }: { workspaceId: string | null }) {
  const color = WS_COLORS[workspaceId ?? ''] ?? '#7A6F55'
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0"
      style={{ background: `${color}22`, color }}>
      {WS_LABELS[workspaceId ?? ''] ?? workspaceId ?? '—'}
    </span>
  )
}

/** Project-level signal — same thresholds as task-hierarchy computeRollup,
 *  applied to the project's tasks. */
function projectSignal(projTasks: Array<{ status: string; dueDate: string | null }>): string {
  const open = projTasks.filter((t) => !DONE_STATUSES.includes(t.status))
  if (projTasks.length === 0) return 'no_tasks'
  if (open.length === 0) return 'all_done'
  const today = new Date().toISOString().split('T')[0]
  let blocked = 0
  let overdue = false
  for (const t of open) {
    const norm = toNormalized(t.status)
    if (norm === 'blocked') blocked++
    if (t.dueDate && t.dueDate < today) overdue = true
  }
  if (blocked > 0) return 'blocked'
  if (overdue) return 'at_risk'
  if (open.length === 1 && projTasks.length > 1) return 'ready_for_review'
  return 'on_track'
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ staleDays?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { staleDays: staleDaysParam } = await searchParams
  const staleDays = Math.max(1, parseInt(staleDaysParam ?? '7', 10) || 7)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = new Date().toISOString().split('T')[0]
  const staleCutoff = new Date(Date.now() - staleDays * 24 * 3600 * 1000)

  const [briefRows, allProjects, openTasks, todayItems, draftRows] = await Promise.all([
    db.select().from(briefs).orderBy(desc(briefs.generatedAt)).limit(1),
    db.select().from(projects),
    db.select().from(tasks).where(isNull(tasks.parentTaskId)),
    db.select().from(commItems).where(gte(commItems.messageTs, todayStart)),
    db.select({ id: commItems.id }).from(commItems).where(eq(commItems.draftStatus, 'awaiting-review')),
  ])

  const brief = briefRows[0] ?? null

  // Project status strip
  const tasksByProject = new Map<string, Array<{ status: string; dueDate: string | null }>>()
  for (const t of openTasks) {
    if (!t.projectId) continue
    if (!tasksByProject.has(t.projectId)) tasksByProject.set(t.projectId, [])
    tasksByProject.get(t.projectId)!.push({ status: t.status, dueDate: t.dueDate })
  }
  const activeProjects = allProjects
    .filter((p) => !DONE_STATUSES.includes(p.status ?? ''))
    .sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      name: p.name,
      workspaceId: p.workspaceId,
      signal: projectSignal(tasksByProject.get(p.id) ?? []),
    }))

  // Resurfaced important tasks: open, urgent/important/overdue, untouched ≥ staleDays
  const resurfaced = openTasks
    .filter((t) => {
      if (DONE_STATUSES.includes(t.status)) return false
      const important = t.urgent || t.important || (t.dueDate && t.dueDate < todayStr)
      if (!important) return false
      const lastTouch = t.lastActivityAt ?? t.updatedAt
      return lastTouch < staleCutoff
    })
    .sort((a, b) => {
      const aT = (a.lastActivityAt ?? a.updatedAt).getTime()
      const bT = (b.lastActivityAt ?? b.updatedAt).getTime()
      return aT - bT // longest-untouched first
    })
    .slice(0, 8)

  // Today's digest counts
  const newToday = todayItems.length
  const interruptsToday = todayItems.filter((i) => i.urgency === 'interrupt').length
  const draftsAwaiting = draftRows.length

  const dayLabel = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-4 border-b border-[rgba(167,155,120,0.13)]">
        <p className="text-xs text-[#7A6F55] uppercase tracking-widest font-medium mb-1">{dayLabel}</p>
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Today</h1>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Digest summary — counts from today's comm_items */}
        <Link href="/messages" data-digest-counts data-new={newToday} data-drafts={draftsAwaiting} data-interrupts={interruptsToday}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 group">
          {[
            { label: 'New messages today', value: newToday, icon: Inbox, color: '#A79B78' },
            { label: 'Drafts awaiting review', value: draftsAwaiting, icon: PenLine, color: '#C9962E' },
            { label: 'Interrupts today', value: interruptsToday, icon: AlertTriangle, color: '#C0452E' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-none border border-[rgba(167,155,120,0.13)] bg-[#1A1510] p-4 group-hover:border-[rgba(167,155,120,0.22)] transition-colors">
              <div className="flex items-start justify-between">
                <span className="font-mono text-[28px] font-semibold text-[#E8DFCE] tabular-nums leading-none">{value}</span>
                <span className="rounded-none p-1.5" style={{ background: `${color}1A` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </span>
              </div>
              <p className="text-xs text-[#A79B78] mt-2">{label}</p>
            </div>
          ))}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest brief */}
          <div data-home-brief className="lg:col-span-2 rounded-none border border-[rgba(167,155,120,0.13)] bg-[#1A1510] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(167,155,120,0.13)]">
              <div className="flex items-center gap-2">
                <Newspaper className="w-3.5 h-3.5 text-[#7A6F55]" />
                <span className="text-xs font-semibold text-[#A79B78] uppercase tracking-widest">Latest brief</span>
              </div>
              {brief && (
                <span className="text-xs text-[#5C5340]" data-brief-provenance>
                  by <span className="text-[#7A6F55]">{brief.generatedBy}</span>
                  {' '}&middot;{' '}
                  {brief.generatedAt.toLocaleString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
            <div className="px-5 py-4">
              {brief ? (
                <BriefMarkdown content={brief.content} />
              ) : (
                <p className="text-sm text-[#5C5340] text-center py-6">
                  No brief yet — briefs arrive automatically from the Email PA.
                </p>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-[rgba(167,155,120,0.09)]">
              <Link href="/brief" className="inline-flex items-center gap-1 text-xs text-[#A79B78] hover:text-[#E8DFCE] transition-colors">
                Open brief <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Resurfaced important tasks */}
          <div data-resurfaced className="rounded-none border border-[rgba(167,155,120,0.13)] bg-[#1A1510]">
            <div className="px-4 py-3 border-b border-[rgba(167,155,120,0.13)]">
              <span className="text-xs font-semibold text-[#A79B78] uppercase tracking-widest">Don&apos;t let it rot</span>
              <p className="text-[11px] text-[#5C5340] mt-0.5">Important, untouched ≥ {staleDays} days</p>
            </div>
            <div className="px-4 py-2">
              {resurfaced.length === 0 ? (
                <p className="text-xs text-[#5C5340] py-4 text-center">Nothing rotting — important work is moving.</p>
              ) : (
                resurfaced.map((t) => {
                  const lastTouch = t.lastActivityAt ?? t.updatedAt
                  const days = Math.floor((Date.now() - lastTouch.getTime()) / 86400000)
                  return (
                    <Link key={t.id} href={`/tasks?workspace=${t.workspaceId}&task=${t.id}`}
                      data-resurfaced-item={t.id}
                      className="block py-2.5 border-b border-[rgba(167,155,120,0.09)] last:border-0 group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-[#E8DFCE] truncate group-hover:text-[#E8DFCE]">{t.title}</span>
                        <span className="text-[10px] font-mono text-[#C0452E] shrink-0">{days}d idle</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <WorkspacePill workspaceId={t.workspaceId} />
                        {t.urgent && <span className="text-[10px] text-[#C0452E]">urgent</span>}
                        {t.important && <span className="text-[10px] text-[#C9962E]">important</span>}
                        {t.dueDate && t.dueDate < todayStr && <span className="text-[10px] text-[#C0452E]">overdue</span>}
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Project status strip */}
        <div data-project-strip className="rounded-none border border-[rgba(167,155,120,0.13)] bg-[#1A1510]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(167,155,120,0.13)]">
            <span className="text-xs font-semibold text-[#A79B78] uppercase tracking-widest">Projects</span>
            <Link href="/projects" className="inline-flex items-center gap-1 text-xs text-[#A79B78] hover:text-[#E8DFCE] transition-colors">
              All projects <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            {activeProjects.length === 0 ? (
              <p className="text-xs text-[#5C5340] w-full text-center py-2">No open projects.</p>
            ) : (
              activeProjects.map((p) => {
                const s = SIGNAL_STYLES[p.signal] ?? SIGNAL_STYLES.on_track
                return (
                  <div key={p.id} data-project-signal={p.signal}
                    className="flex items-center gap-2 rounded-none border border-[rgba(167,155,120,0.13)] bg-[#14100C] px-3 py-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} title={s.label} />
                    <span className="text-sm text-[#E8DFCE] font-medium truncate max-w-[14rem]">{p.name}</span>
                    <WorkspacePill workspaceId={p.workspaceId} />
                    <span className="text-[10px] text-[#5C5340]">{s.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
