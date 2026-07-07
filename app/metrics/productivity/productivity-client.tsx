'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceMetrics {
  workspace: string
  label: string
  color: string
  totalActions: number
  automationRate: number
  hoursSaved: number
  totalApiCostUsd: number
  roi: number
  multiplier: number | null
  systems: string[]
  categories: { category: string; count: number; minutesSaved: number; apiCost: number }[]
  interventions: Record<string, number>
  weeklySeries: { week: string; count: number; minutesSaved: number; apiCost: number }[]
  // email
  emailSent?: number
  emailAutonomous?: number
  emailEscalated?: number
}

interface ProductivityClientProps {
  byWorkspace: WorkspaceMetrics[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WS_COLORS: Record<string, string> = {
  'byron-film': '#C99A1F',
  personal: '#C96F2E',
  korus: '#3E7A70',
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#201A14',
    border: '1px solid rgba(167,155,120,0.22)',
    borderRadius: 0,
    color: '#E8DFCE',
    fontSize: 12,
  },
  cursor: { fill: 'rgba(167,155,120,0.07)' },
}

const INTERVENTION_COLORS = ['#C0452E', '#C9962E', '#9B6B4F', '#B0584A', '#7A6F55']

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionTitle({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-6 h-6 rounded-full bg-[#201A14] border border-[rgba(167,155,120,0.22)] flex items-center justify-center text-xs font-bold text-[#A79B78] shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[#E8DFCE]">{title}</h2>
        {sub && <p className="text-xs text-[#7A6F55] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] ${className}`}>
      {children}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <Card>
      <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: color ?? '#E8DFCE' }}>
        {value}
      </p>
      {sub && <p className="text-xs text-[#5C5340] mt-1">{sub}</p>}
    </Card>
  )
}

function EmptyState({ text = 'No data yet — log actions to populate' }: { text?: string }) {
  return (
    <p className="text-sm text-[#5C5340] py-8 text-center">{text}</p>
  )
}

// ─── Section 1: Overview ────────────────────────────────────────────────────

function Section1Overview({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  const totalActions = byWorkspace.reduce((s, w) => s + w.totalActions, 0)
  const totalHoursSaved = byWorkspace.reduce((s, w) => s + w.hoursSaved, 0)
  const totalApiCost = byWorkspace.reduce((s, w) => s + w.totalApiCostUsd, 0)
  const totalRoi = byWorkspace.reduce((s, w) => s + w.roi, 0)
  const avgAutomation =
    byWorkspace.length > 0
      ? byWorkspace.reduce((s, w) => s + w.automationRate, 0) / byWorkspace.length
      : 0

  return (
    <section>
      <SectionTitle n={1} title="Overview" sub="All workspaces combined" />
      {/* Global summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Actions" value={totalActions} />
        <StatCard
          label="Hours Saved"
          value={`${totalHoursSaved.toFixed(1)}h`}
          sub="vs manual baseline"
        />
        <StatCard
          label="Avg Automation Rate"
          value={`${avgAutomation.toFixed(0)}%`}
          color={avgAutomation >= 90 ? '#7D9B5E' : avgAutomation >= 70 ? '#C9962E' : '#C0452E'}
        />
        <StatCard
          label="Net ROI"
          value={`$${totalRoi.toFixed(0)}`}
          sub={`API cost: $${totalApiCost.toFixed(2)}`}
          color={totalRoi >= 0 ? '#7D9B5E' : '#C0452E'}
        />
      </div>

      {/* Per-workspace row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {byWorkspace.map(ws => (
          <Card key={ws.workspace}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
              <span className="text-sm font-semibold text-[#E8DFCE]">{ws.label}</span>
            </div>
            <div className="space-y-2">
              {[
                { k: 'Actions', v: ws.totalActions },
                { k: 'Hours saved', v: `${ws.hoursSaved.toFixed(1)}h` },
                { k: 'Automation', v: `${ws.automationRate.toFixed(0)}%` },
                { k: 'ROI', v: `$${ws.roi.toFixed(0)}` },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs text-[#7A6F55]">{k}</span>
                  <span className="text-xs font-mono text-[#E8DFCE]">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ─── Section 2: Volume & Throughput ─────────────────────────────────────────

function Section2Volume({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  // Merge weekly series across all workspaces
  const weeks = byWorkspace[0]?.weeklySeries.map(w => w.week) ?? []
  const merged = weeks.map((week, i) => {
    const entry: Record<string, number | string> = { week }
    for (const ws of byWorkspace) {
      entry[ws.label] = ws.weeklySeries[i]?.count ?? 0
    }
    return entry
  })

  // Category totals across all workspaces
  const catMap: Record<string, number> = {}
  for (const ws of byWorkspace) {
    for (const c of ws.categories) {
      catMap[c.category] = (catMap[c.category] ?? 0) + c.count
    }
  }
  const categories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxCat = categories[0]?.[1] ?? 1

  const hasData = byWorkspace.some(w => w.totalActions > 0)

  return (
    <section>
      <SectionTitle n={2} title="Volume & Throughput" sub="Tasks per week by workspace" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Weekly task volume</p>
          {!hasData ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={merged} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="week" tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                {byWorkspace.map(ws => (
                  <Bar key={ws.workspace} dataKey={ws.label} stackId="a" fill={ws.color} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Category breakdown</p>
          {categories.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {categories.map(([cat, count], i) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-[#A79B78] w-24 shrink-0 capitalize">{cat}</span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(167,155,120,0.13)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(count / maxCat) * 100}%`,
                        backgroundColor: Object.values(WS_COLORS)[i % 3],
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#7A6F55] w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}

// ─── Section 3: Time Savings ─────────────────────────────────────────────────

function Section3TimeSavings({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  // Cumulative hours saved per workspace (weekly)
  const weeks = byWorkspace[0]?.weeklySeries.map(w => w.week) ?? []
  const cumulativeData = weeks.map((week, i) => {
    const entry: Record<string, number | string> = { week }
    for (const ws of byWorkspace) {
      let cumulative = 0
      for (let j = 0; j <= i; j++) {
        cumulative += (ws.weeklySeries[j]?.minutesSaved ?? 0) / 60
      }
      entry[ws.label] = Math.round(cumulative * 10) / 10
    }
    return entry
  })

  const hasData = byWorkspace.some(w => w.hoursSaved > 0)

  // Per-category time saved (all workspaces)
  const catMap: Record<string, number> = {}
  for (const ws of byWorkspace) {
    for (const c of ws.categories) {
      catMap[c.category] = (catMap[c.category] ?? 0) + c.minutesSaved / 60
    }
  }
  const catSavings = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxCat = catSavings[0]?.[1] ?? 1

  return (
    <section>
      <SectionTitle n={3} title="Time Savings" sub="AI duration vs estimated manual baseline" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Cumulative hours saved</p>
          {!hasData ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={cumulativeData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="week" tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                {byWorkspace.map(ws => (
                  <Line key={ws.workspace} type="monotone" dataKey={ws.label} stroke={ws.color} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Hours saved by category</p>
          {catSavings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {catSavings.map(([cat, hours], i) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-[#A79B78] w-24 shrink-0 capitalize">{cat}</span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(167,155,120,0.13)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(hours / maxCat) * 100}%`,
                        backgroundColor: Object.values(WS_COLORS)[i % 3],
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#7A6F55] w-10 text-right">{hours.toFixed(1)}h</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Byron Film vs KORUS delta */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {byWorkspace.map(ws => (
          <Card key={ws.workspace}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ws.color }} />
              <span className="text-xs font-semibold text-[#E8DFCE]">{ws.label}</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[#E8DFCE]">{ws.hoursSaved.toFixed(1)}h</p>
            <p className="text-xs text-[#7A6F55] mt-0.5">saved ({ws.totalActions} actions)</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

// ─── Section 4: Automation Rate & Quality ────────────────────────────────────

function Section4Automation({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  // Intervention type pie
  const interventionTotals: Record<string, number> = {}
  for (const ws of byWorkspace) {
    for (const [type, count] of Object.entries(ws.interventions)) {
      interventionTotals[type] = (interventionTotals[type] ?? 0) + count
    }
  }
  const pieData = Object.entries(interventionTotals).map(([name, value]) => ({ name, value }))
  const totalInterventions = pieData.reduce((s, d) => s + d.value, 0)

  // Automation rate summary per workspace
  const automationRows = byWorkspace.map(ws => ({
    label: ws.label,
    color: ws.color,
    rate: ws.automationRate,
    interventionRate: 100 - ws.automationRate,
  }))

  return (
    <section>
      <SectionTitle n={4} title="Automation Rate & Quality" sub="% fully autonomous · human intervention breakdown" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-4">Automation rate by workspace</p>
          <div className="space-y-4">
            {automationRows.map(ws => (
              <div key={ws.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-[#A79B78] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                    {ws.label}
                  </span>
                  <span className="text-xs font-mono text-[#E8DFCE]">{ws.rate.toFixed(1)}%</span>
                </div>
                <div className="relative h-3 rounded-full bg-[rgba(167,155,120,0.13)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${ws.rate}%`, backgroundColor: ws.color }}
                  />
                  {/* Target line at 5% intervention = 95% automation */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-[rgba(167,155,120,0.66)]"
                    style={{ left: '95%' }}
                    title="95% target"
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-[#5C5340]">Intervention: {ws.interventionRate.toFixed(1)}%</span>
                  <span className="text-xs text-[#5C5340]">Target: 95%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Intervention types</p>
          {pieData.length === 0 ? (
            <EmptyState text="No interventions recorded" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={INTERVENTION_COLORS[i % INTERVENTION_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INTERVENTION_COLORS[i % INTERVENTION_COLORS.length] }} />
                      <span className="text-xs text-[#A79B78] capitalize">{d.name}</span>
                    </div>
                    <span className="text-xs font-mono text-[#7A6F55]">
                      {totalInterventions > 0 ? Math.round((d.value / totalInterventions) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}

// ─── Section 5: Cost Efficiency / ROI ────────────────────────────────────────

function Section5Cost({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  // Weekly API cost merged
  const weeks = byWorkspace[0]?.weeklySeries.map(w => w.week) ?? []
  const weeklyData = weeks.map((week, i) => {
    const entry: Record<string, number | string> = { week }
    for (const ws of byWorkspace) {
      entry[ws.label] = Math.round((ws.weeklySeries[i]?.apiCost ?? 0) * 100) / 100
    }
    return entry
  })

  const hasData = byWorkspace.some(w => w.totalApiCostUsd > 0)

  return (
    <section>
      <SectionTitle n={5} title="Cost Efficiency / ROI" sub="API spend vs value generated" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Weekly API cost (USD)</p>
          {!hasData ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="week" tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: '#7A6F55', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`$${v}`, '']} />
                {byWorkspace.map(ws => (
                  <Bar key={ws.workspace} dataKey={ws.label} stackId="a" fill={ws.color} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-4">ROI summary (@ $75/hr)</p>
          <div className="space-y-4">
            {byWorkspace.map(ws => {
              const valueGenerated = ws.hoursSaved * 75
              return (
                <div key={ws.workspace}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#A79B78] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                      {ws.label}
                    </span>
                    <span className={`text-xs font-mono ${ws.roi >= 0 ? 'text-[#7D9B5E]' : 'text-[#C0452E]'}`}>
                      ROI: ${ws.roi.toFixed(0)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { k: 'API cost', v: `$${ws.totalApiCostUsd.toFixed(2)}` },
                      { k: 'Value gen.', v: `$${valueGenerated.toFixed(0)}` },
                      { k: 'Multiplier', v: ws.multiplier ? `${ws.multiplier}×` : '—' },
                    ].map(({ k, v }) => (
                      <div key={k} className="bg-[rgba(167,155,120,0.07)] rounded-none p-2">
                        <p className="text-xs text-[#5C5340]">{k}</p>
                        <p className="text-sm font-mono text-[#E8DFCE]">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </section>
  )
}

// ─── Section 6: Email Operations ─────────────────────────────────────────────

function Section6Email({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  const emailWs = byWorkspace.map(ws => ({
    label: ws.label,
    color: ws.color,
    workspace: ws.workspace,
    sent: ws.emailSent ?? 0,
    autonomous: ws.emailAutonomous ?? 0,
    escalated: ws.emailEscalated ?? 0,
  }))

  const hasData = emailWs.some(w => w.sent > 0 || w.autonomous > 0)

  return (
    <section>
      <SectionTitle n={6} title="Email Operations" sub="Volume · autonomous vs escalated · access comparison" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {emailWs.map(ws => (
          <Card key={ws.workspace}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ws.color }} />
              <span className="text-sm font-semibold text-[#E8DFCE]">{ws.label}</span>
              {ws.workspace === 'korus' && (
                <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(62,122,112,0.12)] text-[#3E7A70] ml-auto">
                  Limited
                </span>
              )}
              {(ws.workspace === 'byron-film' || ws.workspace === 'personal') && (
                <span className="text-xs px-1.5 py-0.5 rounded-none bg-[rgba(125,155,94,0.12)] text-[#7D9B5E] ml-auto">
                  Gmail access
                </span>
              )}
            </div>
            {!hasData ? (
              <p className="text-xs text-[#5C5340]">No email stats yet</p>
            ) : (
              <div className="space-y-1.5">
                {[
                  { k: 'Sent', v: ws.sent },
                  { k: 'Autonomous', v: ws.autonomous },
                  { k: 'Escalated', v: ws.escalated },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-xs text-[#7A6F55]">{k}</span>
                    <span className="text-xs font-mono text-[#E8DFCE]">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Access note */}
      <div className="p-4 rounded-none bg-[rgba(201,111,46,0.06)] border border-[rgba(201,111,46,0.15)]">
        <p className="text-xs text-[#3E7A70] font-medium mb-1">Access gap — KORUS</p>
        <p className="text-xs text-[#A79B78]">
          KORUS has no direct Gmail access. Email operations are handled via manual forwarding only.
          Byron Film & Personal have full Gmail API access enabling autonomous email drafting, sending, and classification.
        </p>
      </div>
    </section>
  )
}

// ─── Section 7: Access Level Comparison ──────────────────────────────────────

const ACCESS_CONFIGS = [
  {
    workspace: 'byron-film',
    label: 'Byron Film',
    color: '#C99A1F',
    level: 'Full Access',
    levelColor: '#7D9B5E',
    icon: '🎬',
    systems: ['Gmail (read + send)', 'Notion (read + write)', 'CRM (full)', 'Xero (invoices)', 'Google Drive', 'Calendar'],
    capabilities: [
      'Autonomous email drafting & sending',
      'Invoice creation & reconciliation',
      'CRM pipeline updates',
      'Project status automation',
      'Document generation',
    ],
  },
  {
    workspace: 'personal',
    label: 'Personal',
    color: '#C96F2E',
    level: 'Full Access',
    levelColor: '#7D9B5E',
    icon: '👤',
    systems: ['Gmail (read + send)', 'Google Calendar', 'Google Drive'],
    capabilities: [
      'Email triage & response',
      'Calendar scheduling',
      'Research & summarisation',
      'Task management',
    ],
  },
  {
    workspace: 'korus',
    label: 'KORUS',
    color: '#3E7A70',
    level: 'Limited Access',
    levelColor: '#3E7A70',
    icon: '🌏',
    systems: ['Notion (read-only)', 'Cockpit'],
    capabilities: [
      'Research & reporting',
      'Task logging (manual)',
      'Document review',
      'No email automation',
      'No CRM writes',
    ],
    limitations: true,
  },
]

function Section7AccessComparison({ byWorkspace }: { byWorkspace: WorkspaceMetrics[] }) {
  const wsMap = Object.fromEntries(byWorkspace.map(w => [w.workspace, w]))

  return (
    <section>
      <SectionTitle
        n={7}
        title="Access Level Comparison"
        sub="What's possible with each integration level — COPIL board view"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {ACCESS_CONFIGS.map(cfg => {
          const ws = wsMap[cfg.workspace]
          return (
            <div
              key={cfg.workspace}
              className="rounded-none border overflow-hidden"
              style={{ borderColor: `${cfg.color}30` }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b" style={{ borderColor: `${cfg.color}20`, background: `${cfg.color}0A` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className="text-sm font-bold text-[#E8DFCE]">{cfg.label}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-none ml-auto font-medium"
                    style={{ color: cfg.levelColor, background: `${cfg.levelColor}15` }}
                  >
                    {cfg.level}
                  </span>
                </div>
                {ws && (
                  <div className="flex gap-3 text-xs text-[#7A6F55]">
                    <span>{ws.totalActions} actions</span>
                    <span>·</span>
                    <span>{ws.automationRate.toFixed(0)}% auto</span>
                    {ws.multiplier && (
                      <>
                        <span>·</span>
                        <span>{ws.multiplier}× faster</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Systems */}
              <div className="px-4 py-3 bg-[#1A1510]">
                <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-2">Connected systems</p>
                <ul className="space-y-1">
                  {cfg.systems.map(s => (
                    <li key={s} className="flex items-center gap-2 text-xs text-[#A79B78]">
                      <span style={{ color: cfg.color }}>✓</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Capabilities */}
              <div className="px-4 py-3 bg-[#14100C] border-t border-[rgba(167,155,120,0.09)]">
                <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-2">Capabilities</p>
                <ul className="space-y-1">
                  {cfg.capabilities.map(c => (
                    <li key={c} className="flex items-start gap-2 text-xs" style={{ color: cfg.limitations ? '#7A6F55' : '#A79B78' }}>
                      <span style={{ color: cfg.limitations ? '#C0452E' : cfg.color }} className="shrink-0">
                        {cfg.limitations ? '✗' : '✓'}
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {/* Multiplier summary */}
      <div className="mt-4 p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
        <p className="text-xs text-[#7A6F55] uppercase tracking-wide mb-3">Productivity multiplier — what full access enables</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ACCESS_CONFIGS.map(cfg => {
            const ws = wsMap[cfg.workspace]
            return (
              <div key={cfg.workspace} className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-none flex items-center justify-center text-lg font-bold font-mono shrink-0"
                  style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                >
                  {ws?.multiplier ? `${ws.multiplier}×` : '—'}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#E8DFCE]">{cfg.label}</p>
                  <p className="text-xs text-[#7A6F55]">speed vs manual</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function ProductivityClient({ byWorkspace }: ProductivityClientProps) {
  return (
    <div className="min-h-screen bg-[#14100C] text-[#E8DFCE]">
      {/* Header */}
      <div className="border-b border-[rgba(167,155,120,0.13)] bg-[#14100C] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-[#E8DFCE]">AI Productivity Comparison</h1>
            <p className="text-xs text-[#7A6F55]">
              Cross-workspace · COPIL board view ·{' '}
              {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {[
              { label: 'Byron Film', color: '#C99A1F' },
              { label: 'Personal', color: '#C96F2E' },
              { label: 'KORUS', color: '#3E7A70' },
            ].map(ws => (
              <div key={ws.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                <span className="text-xs text-[#7A6F55] hidden sm:inline">{ws.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        <Section1Overview byWorkspace={byWorkspace} />
        <Section2Volume byWorkspace={byWorkspace} />
        <Section3TimeSavings byWorkspace={byWorkspace} />
        <Section4Automation byWorkspace={byWorkspace} />
        <Section5Cost byWorkspace={byWorkspace} />
        <Section6Email byWorkspace={byWorkspace} />
        <Section7AccessComparison byWorkspace={byWorkspace} />
      </div>
    </div>
  )
}
