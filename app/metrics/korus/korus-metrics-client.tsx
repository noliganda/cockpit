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

const KORUS_TEAL = '#008080'
const CHART_COLORS = ['#008080', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444']

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
      <p className="text-xs text-[#A0A0A0] uppercase tracking-wide mb-3">{label}</p>
      <p className="text-3xl font-bold text-[#F5F5F5] font-mono tabular-nums">{value}</p>
      {sub && <p className="text-xs text-[#6B7280] mt-1">{sub}</p>}
    </div>
  )
}

function SectionTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-6 h-6 rounded-full bg-[#008080] flex items-center justify-center text-xs font-bold text-white">{n}</div>
      <h2 className="text-base font-semibold text-[#F5F5F5]">{title}</h2>
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#222222', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 6, color: '#F5F5F5', fontSize: 12 },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
}

export function KorusMetricsClient({ metrics, recentActivity, allProjects, allContacts, pipeline, taskVolumeData, activityVolumeData }: KorusMetricsProps) {
  const milestones = [
    { date: '2026-Q1', title: 'KORUS SG entity setup', status: 'done' },
    { date: '2026-Q2', title: 'Recruitment: 3 hires', status: allContacts.filter(c => c.tags?.includes('hired')).length >= 3 ? 'done' : 'in-progress' },
    { date: '2026-Q2', title: 'AU expansion — first contract', status: 'in-progress' },
    { date: '2026-Q3', title: '$500K revenue milestone', status: 'pending' },
    { date: '2026-Q4', title: 'Full APAC ops team', status: 'pending' },
  ]

  const statusColors: Record<string, string> = { done: '#22C55E', 'in-progress': '#F59E0B', pending: '#6B7280' }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5]">
      {/* Header bar */}
      <div className="border-b border-[rgba(255,255,255,0.06)] bg-[#0F0F0F] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#008080] flex items-center justify-center text-sm">🌏</div>
            <div>
              <h1 className="text-sm font-bold text-[#F5F5F5]">KORUS Group — APAC Operations</h1>
              <p className="text-xs text-[#6B7280]">Board Dashboard · {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="h-0.5 w-24 rounded-full" style={{ background: 'linear-gradient(to right, #008080, transparent)' }} />
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
          <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            {taskVolumeData.length === 0 ? (
              <p className="text-sm text-[#4B5563] py-4 text-center">No task data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={taskVolumeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
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
          <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            {pipeline.length === 0 ? (
              <p className="text-sm text-[#4B5563] py-4 text-center">No task data</p>
            ) : pipeline.map((item, i) => (
              <div key={item.stage} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="text-xs text-[#A0A0A0] w-28 shrink-0">{item.stage}</span>
                <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: metrics.totalTasks > 0 ? `${(item.count / Math.max(metrics.totalTasks, 1)) * 100}%` : '0%', backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <span className="text-xs font-mono text-[#6B7280] w-8 text-right">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Operational Cost Trend — real activity data */}
        <section>
          <SectionTitle n={4} title="Operational Activity Trend" />
          <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            {activityVolumeData.length === 0 ? (
              <p className="text-sm text-[#4B5563] py-4 text-center">No activity data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={activityVolumeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
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
          <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            {[
              { category: 'Tasks Completed', bf: 45, korus: metrics.tasksCompleted },
              { category: 'Projects Active', bf: 3, korus: metrics.activeProjects },
              { category: 'Contacts Managed', bf: 12, korus: allContacts.length },
            ].map(item => (
              <div key={item.category} className="mb-4 last:mb-0">
                <p className="text-xs text-[#6B7280] mb-1.5">{item.category}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-[#D4A017]">Byron Film</span>
                      <span className="text-xs font-mono text-[#6B7280] ml-auto">{item.bf}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((item.bf / Math.max(item.bf, item.korus, 1)) * 100, 100)}%`, background: '#D4A017' }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-[#008080]">KORUS</span>
                      <span className="text-xs font-mono text-[#6B7280] ml-auto">{item.korus}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((item.korus / Math.max(item.bf, item.korus, 1)) * 100, 100)}%`, background: '#008080' }} />
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
          <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-[#4B5563] py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 15).map(entry => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#008080] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F5F5F5]">
                        <span className="text-[#A0A0A0]">{entry.actor}</span>{' '}
                        {entry.action} {entry.entityType}
                        {entry.entityTitle && `: ${entry.entityTitle}`}
                      </p>
                      <p className="text-xs text-[#6B7280]">{formatRelativeDate(entry.createdAt)}</p>
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
          <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  {['Candidate', 'Role', 'Stage', 'Source'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allContacts.filter(c => c.tags?.includes('candidate') || c.tags?.includes('recruitment')).length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#4B5563]">No candidates tracked yet</td></tr>
                ) : allContacts.filter(c => c.tags?.includes('candidate') || c.tags?.includes('recruitment')).map(c => (
                  <tr key={c.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-2.5 text-sm text-[#F5F5F5]">{c.name}</td>
                    <td className="px-4 py-2.5 text-xs text-[#A0A0A0]">{c.role ?? '—'}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{c.pipelineStage ?? 'Active'}</span></td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280]">{c.source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 8: Outreach & Business Development */}
        <section>
          <SectionTitle n={8} title="Outreach & Business Development" />
          <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  {['Project', 'Status', 'Region', 'Budget'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allProjects.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[#4B5563]">No projects yet</td></tr>
                ) : allProjects.slice(0, 8).map(p => (
                  <tr key={p.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-2.5 text-sm text-[#F5F5F5]">{p.name}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{p.status ?? 'active'}</span></td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280]">{p.region ?? 'Global'}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[#A0A0A0]">{p.budget ? `$${p.budget}` : '—'}</td>
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
              <div key={item.entity} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#F5F5F5]">{item.entity}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'Active' ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]'}`}>{item.status}</span>
                </div>
                <p className="text-xs text-[#6B7280]">{item.details}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 10: Systems & Infrastructure */}
        <section>
          <SectionTitle n={10} title="Systems & Infrastructure" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { system: 'OPS Dashboard v4', status: 'Live', note: 'This dashboard' },
              { system: 'Notion (legacy)', status: 'Syncing', note: 'Read-only sync' },
              { system: 'Neon Postgres', status: 'Live', note: 'ap-southeast-2' },
              { system: 'OpenClaw Gateway', status: 'Local', note: 'ws://localhost:18789' },
              { system: 'Vercel Deploy', status: 'Active', note: 'Auto-deploy on push' },
              { system: 'Vector Search', status: 'Ready', note: 'pgvector enabled' },
            ].map(item => (
              <div key={item.system} className="p-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'Live' || item.status === 'Active' || item.status === 'Ready' ? 'bg-[#22C55E]' : item.status === 'Syncing' ? 'bg-[#F59E0B]' : 'bg-[#6B7280]'}`} />
                <div>
                  <p className="text-xs font-medium text-[#F5F5F5]">{item.system}</p>
                  <p className="text-xs text-[#6B7280]">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 11: Milestone Timeline */}
        <section>
          <SectionTitle n={11} title="Milestone Timeline" />
          <div className="relative pl-6 border-l border-[rgba(255,255,255,0.06)]">
            {milestones.map((m, i) => (
              <div key={i} className="mb-6 last:mb-0 relative">
                <div className="absolute -left-7 w-3 h-3 rounded-full border-2 border-[#0F0F0F]" style={{ backgroundColor: statusColors[m.status] ?? '#6B7280' }} />
                <p className="text-xs text-[#6B7280] mb-0.5">{m.date}</p>
                <p className="text-sm font-medium text-[#F5F5F5]">{m.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${m.status === 'done' ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : m.status === 'in-progress' ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]' : 'bg-[rgba(255,255,255,0.06)] text-[#6B7280]'}`}>
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
