'use client'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatRelativeDate } from '@/lib/utils'
import type { Task, Project, Contact, ActivityLogEntry } from '@/types'

interface DailyCount {
  day: string
  count: number
}

interface KorusMetricsProps {
  metrics: {
    tasksCompleted: number
    hoursSaved: number
    emailsProcessed: number
    researchHours: number
    activeCandidates: number
    proposalsSent: number
    activeProjects: number
    totalTasks: number
  }
  recentActivity: ActivityLogEntry[]
  allTasks: Task[]
  allProjects: Project[]
  allContacts: Contact[]
  pipeline: Array<{ stage: string; count: number }>
  regionData: Array<{ region: string; tasks: number }>
  taskVolumeData: DailyCount[]
  activityVolumeData: DailyCount[]
}

const KORUS_TEAL = '#3E7A70'
const CHART_COLORS = ['#3E7A70', '#7D9B5E', '#5F7A72', '#C9962E', '#C0452E']

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
      <p className="text-xs text-[#A79B78] uppercase tracking-wide mb-3">{label}</p>
      <p className="text-3xl font-bold text-[#E8DFCE] font-mono tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[#7A6F55] mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-6 h-6 rounded-full bg-[#3E7A70] flex items-center justify-center text-xs font-bold text-[#E8DFCE]">{n}</div>
      <h2 className="text-base font-semibold text-[#E8DFCE]">{title}</h2>
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#272018', border: '1px solid rgba(167,155,120,0.22)', borderRadius: 0, color: '#E8DFCE', fontSize: 12 },
  cursor: { fill: 'rgba(167,155,120,0.09)' },
}

export function KorusMetricsClient({ metrics, recentActivity, allProjects, allContacts, pipeline, taskVolumeData, activityVolumeData }: KorusMetricsProps) {
  const milestones = [
    { date: '2026-Q1', title: 'KORUS SG entity setup', status: 'done' },
    { date: '2026-Q2', title: 'Recruitment: 3 hires', status: allContacts.filter(c => c.tags?.includes('hired')).length >= 3 ? 'done' : 'in-progress' },
    { date: '2026-Q2', title: 'AU expansion — first contract', status: 'in-progress' },
    { date: '2026-Q3', title: '$500K revenue milestone', status: 'pending' },
    { date: '2026-Q4', title: 'Full APAC ops team', status: 'pending' },
  ]

  const statusColors: Record<string, string> = { done: '#7D9B5E', 'in-progress': '#C9962E', pending: '#7A6F55' }

  return (
    <div className="min-h-screen bg-[#14100C] text-[#E8DFCE]">
      {/* Header bar */}
      <div className="border-b border-[rgba(167,155,120,0.13)] bg-[#14100C] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#3E7A70] flex items-center justify-center font-mono text-[13px] font-medium text-[#E8DFCE]">K</div>
            <div>
              <h1 className="text-sm font-bold text-[#E8DFCE]">KORUS Group — APAC Operations</h1>
              <p className="text-xs text-[#7A6F55]">Board Dashboard · {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="h-0.5 w-24 rounded-full" style={{ background: 'linear-gradient(to right, #3E7A70, transparent)' }} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Section 1: Key Metrics */}
        <section>
          <SectionTitle n={1} title="Key Metrics" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Tasks Completed" value={metrics.tasksCompleted} />
            <StatCard label="Hours Saved" value={metrics.hoursSaved} sub="Est. @$300/hr" />
            <StatCard label="Emails Processed" value={metrics.emailsProcessed} />
            <StatCard label="Research Hours" value={metrics.researchHours} />
            <StatCard label="Active Candidates" value={metrics.activeCandidates} />
            <StatCard label="Proposals Sent" value={metrics.proposalsSent} />
          </div>
        </section>

        {/* Section 2: Task Volume — real data */}
        <section>
          <SectionTitle n={2} title="Task Volume — Last 30 Days" />
          <div className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
            {taskVolumeData.length === 0 ? (
              <p className="text-sm text-[#5C5340] py-4 text-center">No task data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={taskVolumeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="day" tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Tasks" fill={KORUS_TEAL} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Section 3: Category Analysis */}
        <section>
          <SectionTitle n={3} title="Category Analysis" />
          <div className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
            {pipeline.length === 0 ? (
              <p className="text-sm text-[#5C5340] py-4 text-center">No task data</p>
            ) : pipeline.map((item, i) => (
              <div key={item.stage} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="text-xs text-[#A79B78] w-28 shrink-0">{item.stage}</span>
                <div className="flex-1 h-2 rounded-full bg-[rgba(167,155,120,0.13)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: metrics.totalTasks > 0 ? `${(item.count / Math.max(metrics.totalTasks, 1)) * 100}%` : '0%', backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <span className="text-xs font-mono text-[#7A6F55] w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Operational Cost Trend — real activity data */}
        <section>
          <SectionTitle n={4} title="Operational Activity Trend" />
          <div className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
            {activityVolumeData.length === 0 ? (
              <p className="text-sm text-[#5C5340] py-4 text-center">No activity data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={activityVolumeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="day" tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="count" name="Actions" stroke={KORUS_TEAL} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Section 5: BF vs KORUS Comparison */}
        <section>
          <SectionTitle n={5} title="Byron Film vs KORUS — Capability Comparison (90 days)" />
          <div className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
            {[
              { category: 'Tasks Completed', bf: 45, korus: metrics.tasksCompleted },
              { category: 'Projects Active', bf: 3, korus: metrics.activeProjects },
              { category: 'Contacts Managed', bf: 12, korus: allContacts.length },
            ].map(item => (
              <div key={item.category} className="mb-4 last:mb-0">
                <p className="text-xs text-[#7A6F55] mb-1.5">{item.category}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-[#C99A1F]">Byron Film</span>
                      <span className="text-xs font-mono text-[#7A6F55] ml-auto">{item.bf}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(167,155,120,0.13)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((item.bf / Math.max(item.bf, item.korus, 1)) * 100, 100)}%`, background: '#C99A1F' }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-[#3E7A70]">KORUS</span>
                      <span className="text-xs font-mono text-[#7A6F55] ml-auto">{item.korus}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(167,155,120,0.13)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((item.korus / Math.max(item.bf, item.korus, 1)) * 100, 100)}%`, background: '#3E7A70' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Activity Timeline */}
        <section>
          <SectionTitle n={6} title="Activity Timeline" />
          <div className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-[#5C5340] py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 15).map(entry => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3E7A70] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#E8DFCE]">
                        <span className="text-[#A79B78]">{entry.actor}</span>{' '}
                        {entry.action} {entry.entityType}
                        {entry.entityTitle && `: ${entry.entityTitle}`}
                      </p>
                      <p className="text-xs text-[#7A6F55]">{formatRelativeDate(entry.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 7: Recruitment Pipeline */}
        <section>
          <SectionTitle n={7} title="Recruitment Pipeline" />
          <div className="rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(167,155,120,0.13)]">
                  {['Candidate', 'Role', 'Source'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allContacts.filter(c => c.tags?.includes('candidate') || c.tags?.includes('recruitment')).length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-[#5C5340]">No candidates tracked yet</td></tr>
                ) : allContacts.filter(c => c.tags?.includes('candidate') || c.tags?.includes('recruitment')).map(c => (
                  <tr key={c.id} className="border-b border-[rgba(167,155,120,0.09)] hover:bg-[rgba(167,155,120,0.04)]">
                    <td className="px-4 py-2.5 text-sm text-[#E8DFCE]">{c.name}</td>
                    <td className="px-4 py-2.5 text-xs text-[#A79B78]">{c.role ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[#7A6F55]">{c.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 8: Outreach & Business Development */}
        <section>
          <SectionTitle n={8} title="Outreach & Business Development" />
          <div className="rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(167,155,120,0.13)]">
                  {['Project', 'Status', 'Region', 'Budget'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allProjects.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#5C5340]">No projects yet</td></tr>
                ) : allProjects.slice(0, 8).map(p => (
                  <tr key={p.id} className="border-b border-[rgba(167,155,120,0.09)] hover:bg-[rgba(167,155,120,0.04)]">
                    <td className="px-4 py-2.5 text-sm text-[#E8DFCE]">{p.name}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(167,155,120,0.13)] text-[#A79B78]">{p.status ?? 'active'}</span></td>
                    <td className="px-4 py-2.5 text-xs text-[#7A6F55]">{p.region ?? 'Global'}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[#A79B78]">{p.budget ? `$${p.budget}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 9: Entity Setup */}
        <section>
          <SectionTitle n={9} title="Entity Setup" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { entity: 'KORUS SG (Singapore)', status: 'Active', details: 'Registered · GST enrolled' },
              { entity: 'KORUS AU (Australia)', status: 'In Progress', details: 'ACN registration underway' },
            ].map(item => (
              <div key={item.entity} className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#E8DFCE]">{item.entity}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'Active' ? 'bg-[rgba(125,155,94,0.12)] text-[#7D9B5E]' : 'bg-[rgba(201,150,46,0.12)] text-[#C9962E]'}`}>{item.status}</span>
                </div>
                <p className="text-xs text-[#7A6F55]">{item.details}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 10: Systems & Infrastructure */}
        <section>
          <SectionTitle n={10} title="Systems & Infrastructure" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { system: 'Cockpit v5', status: 'Live', note: 'This cockpit' },
              { system: 'Notion (legacy)', status: 'Syncing', note: 'Read-only sync' },
              { system: 'Neon Postgres', status: 'Live', note: 'ap-southeast-2' },
              { system: 'OpenClaw Gateway', status: 'Local', note: 'ws://localhost:18789' },
              { system: 'Vercel Deploy', status: 'Active', note: 'Auto-deploy on push' },
              { system: 'Vector Search', status: 'Ready', note: 'pgvector enabled' },
            ].map(item => (
              <div key={item.system} className="p-3 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'Live' || item.status === 'Active' || item.status === 'Ready' ? 'bg-[#7D9B5E]' : item.status === 'Syncing' ? 'bg-[#C9962E]' : 'bg-[#7A6F55]'}`} />
                <div>
                  <p className="text-xs font-medium text-[#E8DFCE]">{item.system}</p>
                  <p className="text-xs text-[#7A6F55]">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 11: Milestone Timeline */}
        <section>
          <SectionTitle n={11} title="Milestone Timeline" />
          <div className="relative pl-6 border-l border-[rgba(167,155,120,0.13)]">
            {milestones.map((m, i) => (
              <div key={i} className="mb-6 last:mb-0 relative">
                <div className="absolute -left-7 w-3 h-3 rounded-full border-2 border-[#14100C]" style={{ backgroundColor: statusColors[m.status] ?? '#7A6F55' }} />
                <p className="text-xs text-[#7A6F55] mb-0.5">{m.date}</p>
                <p className="text-sm font-medium text-[#E8DFCE]">{m.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${m.status === 'done' ? 'bg-[rgba(125,155,94,0.12)] text-[#7D9B5E]' : m.status === 'in-progress' ? 'bg-[rgba(201,150,46,0.12)] text-[#C9962E]' : 'bg-[rgba(167,155,120,0.13)] text-[#7A6F55]'}`}>
                  {m.status === 'done' ? 'Complete' : m.status === 'in-progress' ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
