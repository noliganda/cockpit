'use client'
import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Plus, X, TrendingUp, CheckCircle, Zap, DollarSign, Users, Calendar, Bot } from 'lucide-react'
import { toast } from 'sonner'
import { AGENTS } from '@/types'
import { type Task } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveStats {
  totalEvents: number
  totalCost: number
  totalTokens: number
  automationRate: number
  interventionRate: number
  interventionCount: number
  costPerEvent: number
}

interface AgentRow {
  agentId: string
  count: number
  cost: number
  interventions: number
}

interface FamilyRow {
  family: string
  count: number
}

interface EntityRow {
  entity: string
  count: number
}

interface DailyPoint {
  date: string
  count: number
  cost: number
}

interface ManualEntry {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  tasksCompleted: number | null
  tasksTotal: number | null
  avgTaskDurationMins: string | null
  automationRate: string | null
  apiCostUsd: string | null
  costPerTask: string | null
  emailsSent: number | null
  emailsReceived: number | null
  avgResponseTimeMins: string | null
  humanInterventionRate: string | null
  clientSatisfaction: string | null
  securityIncidents: number | null
  notes: string | null
  reportingPhase: string | null
  createdAt: Date
  updatedAt: Date
}

interface AIMetricsClientProps {
  liveStats: LiveStats
  agentBreakdown: AgentRow[]
  familyBreakdown: FamilyRow[]
  entityBreakdown: EntityRow[]
  dailySeries: DailyPoint[]
  manualEntries: ManualEntry[]
  recentTasks: Task[]
}

const ENTITY_LABELS: Record<string, string> = {
  byron_film: 'Byron Film',
  korus: 'KORUS',
  olivier_marcolin: 'Personal',
  shared: 'Shared',
}

const statCard = 'rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4'
const inputCls = 'w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]'
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1'

// ── Log Entry Dialog (writes to ai_metrics — manual supplementary entries) ──
interface LogDialogProps {
  onClose: () => void
  onSaved: (row: ManualEntry) => void
}

function LogEntryDialog({ onClose, onSaved }: LogDialogProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [periodStart, setPeriodStart] = useState(today)
  const [periodEnd, setPeriodEnd] = useState(today)
  const [tasksCompleted, setTasksCompleted] = useState('')
  const [tasksTotal, setTasksTotal] = useState('')
  const [avgDuration, setAvgDuration] = useState('')
  const [automationRate, setAutomationRate] = useState('')
  const [apiCost, setApiCost] = useState('')
  const [emailsSent, setEmailsSent] = useState('')
  const [emailsReceived, setEmailsReceived] = useState('')
  const [humanIntervention, setHumanIntervention] = useState('')
  const [clientSatisfaction, setClientSatisfaction] = useState('')
  const [securityIncidents, setSecurityIncidents] = useState('0')
  const [notes, setNotes] = useState('')
  const [reportingPhase, setReportingPhase] = useState<'daily' | 'weekly' | 'copil'>('daily')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        period,
        periodStart,
        periodEnd,
        reportingPhase,
        securityIncidents: Number(securityIncidents) || 0,
      }
      if (tasksCompleted) payload.tasksCompleted = Number(tasksCompleted)
      if (tasksTotal) payload.tasksTotal = Number(tasksTotal)
      if (avgDuration) payload.avgTaskDurationMins = Number(avgDuration)
      if (automationRate) payload.automationRate = Number(automationRate)
      if (apiCost) payload.apiCostUsd = Number(apiCost)
      if (emailsSent) payload.emailsSent = Number(emailsSent)
      if (emailsReceived) payload.emailsReceived = Number(emailsReceived)
      if (humanIntervention) payload.humanInterventionRate = Number(humanIntervention)
      if (clientSatisfaction) payload.clientSatisfaction = clientSatisfaction
      if (notes) payload.notes = notes
      if (tasksCompleted && tasksTotal && apiCost) {
        const tc = Number(tasksCompleted)
        const cost = Number(apiCost)
        if (tc > 0) payload.costPerTask = cost / tc
      }

      const res = await fetch('/api/ai-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const row = await res.json() as ManualEntry
        onSaved(row)
        toast.success('Metrics logged')
        onClose()
      } else {
        toast.error('Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Log Metrics Entry</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Period Type</label>
              <select value={period} onChange={e => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')} className={inputCls + ' appearance-none'}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Start</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputCls + ' [color-scheme:dark]'} />
            </div>
            <div>
              <label className={labelCls}>End</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputCls + ' [color-scheme:dark]'} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Tasks Done</label><input type="number" value={tasksCompleted} onChange={e => setTasksCompleted(e.target.value)} placeholder="0" className={inputCls} /></div>
            <div><label className={labelCls}>Tasks Total</label><input type="number" value={tasksTotal} onChange={e => setTasksTotal(e.target.value)} placeholder="0" className={inputCls} /></div>
            <div><label className={labelCls}>Avg Duration (min)</label><input type="number" value={avgDuration} onChange={e => setAvgDuration(e.target.value)} placeholder="0" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Automation Rate (%)</label><input type="number" min="0" max="100" value={automationRate} onChange={e => setAutomationRate(e.target.value)} placeholder="85" className={inputCls} /></div>
            <div><label className={labelCls}>API Cost (USD)</label><input type="number" step="0.01" value={apiCost} onChange={e => setApiCost(e.target.value)} placeholder="0.00" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Emails Sent</label><input type="number" value={emailsSent} onChange={e => setEmailsSent(e.target.value)} placeholder="0" className={inputCls} /></div>
            <div><label className={labelCls}>Emails Received</label><input type="number" value={emailsReceived} onChange={e => setEmailsReceived(e.target.value)} placeholder="0" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Human Intervention (%)</label><input type="number" min="0" max="100" value={humanIntervention} onChange={e => setHumanIntervention(e.target.value)} placeholder="15" className={inputCls} /></div>
            <div>
              <label className={labelCls}>Client Satisfaction</label>
              <select value={clientSatisfaction} onChange={e => setClientSatisfaction(e.target.value)} className={inputCls + ' appearance-none'}>
                <option value="">— Select —</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div><label className={labelCls}>Security Incidents</label><input type="number" min="0" value={securityIncidents} onChange={e => setSecurityIncidents(e.target.value)} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>Reporting Phase</label>
            <select value={reportingPhase} onChange={e => setReportingPhase(e.target.value as 'daily' | 'weekly' | 'copil')} className={inputCls + ' appearance-none'}>
              <option value="daily">Daily (Week 1-2)</option>
              <option value="weekly">Weekly (Week 3-4)</option>
              <option value="copil">COPIL Review (Month End)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Notes / Context</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add context, issues, highlights..." className={inputCls + ' resize-none'} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#A0A0A0] hover:text-[#F5F5F5]">Cancel</button>
          <button onClick={handleSave} disabled={saving || !periodStart || !periodEnd}
            className="px-4 py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40">
            {saving ? 'Saving...' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.10)] px-3 py-2 text-xs">
      <p className="text-[#A0A0A0] mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="text-[#F5F5F5] font-medium">{p.value}</span></p>
      ))}
    </div>
  )
}

// ── Main Client ───────────────────────────────────────────────────────────────
export function AIMetricsClient({
  liveStats,
  agentBreakdown,
  familyBreakdown,
  entityBreakdown,
  dailySeries,
  manualEntries,
  recentTasks,
}: AIMetricsClientProps) {
  const [entries, setEntries] = useState<ManualEntry[]>(manualEntries)
  const [showLog, setShowLog] = useState(false)

  const dbTasksDone = recentTasks.filter(t => ['Done', 'Completed', 'Delivered', 'Won'].includes(t.status)).length

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">AI Operations Metrics</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Live from canonical operational log (last 90 days)</p>
        </div>
        <button
          onClick={() => setShowLog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Log Entry
        </button>
      </div>

      {/* KPI Cards — derived from canonical activity_log */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <div className={statCard}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-[#22C55E]" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">Agent Events</span>
          </div>
          <p className="text-3xl font-bold text-[#F5F5F5]">{liveStats.totalEvents}</p>
          <p className="text-xs text-[#4B5563] mt-1">{dbTasksDone} tasks done in DB</p>
        </div>

        <div className={statCard}>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#3B82F6]" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">Automation Rate</span>
          </div>
          <p className="text-3xl font-bold text-[#F5F5F5]">{liveStats.automationRate.toFixed(0)}<span className="text-lg text-[#6B7280]">%</span></p>
          <p className="text-xs text-[#4B5563] mt-1">no human intervention</p>
        </div>

        <div className={statCard}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-[#D4A017]" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">API Cost</span>
          </div>
          <p className="text-3xl font-bold text-[#F5F5F5]">${liveStats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-[#4B5563] mt-1">${liveStats.costPerEvent.toFixed(3)}/event</p>
        </div>

        <div className={statCard}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#F97316]" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">Human Intervention</span>
          </div>
          <p className="text-3xl font-bold text-[#F5F5F5]">{liveStats.interventionRate.toFixed(0)}<span className="text-lg text-[#6B7280]">%</span></p>
          <p className="text-xs text-[#4B5563] mt-1">{liveStats.interventionCount} events required review</p>
        </div>

        <div className={statCard}>
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-[#A855F7]" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">Active Agents</span>
          </div>
          <p className="text-3xl font-bold text-[#F5F5F5]">{agentBreakdown.length}</p>
          <p className="text-xs text-[#4B5563] mt-1">{liveStats.totalTokens.toLocaleString()} tokens used</p>
        </div>

        <div className={statCard}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#14B8A6]" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">Event Families</span>
          </div>
          <p className="text-3xl font-bold text-[#F5F5F5]">{familyBreakdown.length}</p>
          <p className="text-xs text-[#4B5563] mt-1">distinct operational domains</p>
        </div>
      </div>

      {/* Charts — derived from canonical daily series */}
      {dailySeries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">Agent Events per Day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailySeries} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">Daily API Cost (USD)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailySeries} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cost" stroke="#D4A017" dot={false} strokeWidth={2} name="Cost ($)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Agent Breakdown */}
      {agentBreakdown.length > 0 && (
        <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4 mb-8">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">Agent Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agentBreakdown.map(a => {
              const def = AGENTS.find(ag => ag.id === a.agentId)
              const autoRate = a.count > 0 ? Math.round(((a.count - a.interventions) / a.count) * 100) : 0
              return (
                <div key={a.agentId} className="rounded-[6px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {def && <span className="text-sm">{def.emoji}</span>}
                    <span className="text-sm font-medium" style={{ color: def?.color ?? '#A0A0A0' }}>
                      {def?.name ?? a.agentId}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-[#4B5563]">Events</p>
                      <p className="text-sm font-mono text-[#F5F5F5]">{a.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#4B5563]">Cost</p>
                      <p className="text-sm font-mono text-[#F5F5F5]">${a.cost.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#4B5563]">Auto %</p>
                      <p className="text-sm font-mono text-[#F5F5F5]">{autoRate}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event Family + Entity Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {familyBreakdown.length > 0 && (
          <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-3">Event Families</h3>
            <div className="space-y-2">
              {familyBreakdown.map(f => {
                const max = familyBreakdown[0]?.count ?? 1
                return (
                  <div key={f.family} className="flex items-center gap-3">
                    <span className="text-xs text-[#A0A0A0] w-24 shrink-0 capitalize">{f.family}</span>
                    <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${(f.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-[#6B7280] w-6 text-right">{f.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {entityBreakdown.length > 0 && (
          <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-3">By Entity</h3>
            <div className="space-y-2">
              {entityBreakdown.map(e => {
                const max = entityBreakdown[0]?.count ?? 1
                return (
                  <div key={e.entity} className="flex items-center gap-3">
                    <span className="text-xs text-[#A0A0A0] w-24 shrink-0">{ENTITY_LABELS[e.entity] ?? e.entity}</span>
                    <div className="flex-1 h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <div className="h-full rounded-full bg-[#D4A017]" style={{ width: `${(e.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-[#6B7280] w-6 text-right">{e.count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reporting schedule */}
      <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] p-4 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-[#6B7280]" />
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Reporting Schedule</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Phase 1: Week 1-2', desc: 'Daily reporting' },
            { label: 'Phase 2: Week 3-4', desc: 'Weekly reporting' },
            { label: 'Phase 3: Month End', desc: 'Full COPIL dashboard' },
          ].map(phase => (
            <div key={phase.label} className="rounded-[6px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-3">
              <p className="text-xs font-medium text-[#F5F5F5] mb-0.5">{phase.label}</p>
              <p className="text-xs text-[#6B7280]">{phase.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent task log from DB */}
      <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Recent Task Log (from DB)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                {['Task', 'Status', 'Priority', 'Assignee', 'Tags', 'Created'].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTasks.slice(0, 30).map(t => (
                <tr key={t.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="px-4 py-2.5 text-sm text-[#F5F5F5] max-w-[200px] truncate">{t.title}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ['Done', 'Completed'].includes(t.status) ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' :
                      t.status === 'In Progress' ? 'bg-[rgba(59,130,246,0.12)] text-[#3B82F6]' :
                      'bg-[rgba(255,255,255,0.06)] text-[#6B7280]'
                    }`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{t.priority ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{t.assignee ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#6B7280]">{t.tags?.join(', ') ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-[#4B5563]">
                    {new Date(t.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentTasks.length === 0 && (
            <p className="text-center text-sm text-[#4B5563] py-8">No tasks in the last 90 days</p>
          )}
        </div>
      </div>

      {/* Manual logged entries table (from ai_metrics) */}
      {entries.length > 0 && (
        <div className="rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Manual Metric Entries (ai_metrics)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  {['Period', 'Type', 'Done/Total', 'Automation', 'API Cost', 'Intervention', 'Security', 'Phase'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(m => (
                  <tr key={m.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-2.5 text-xs text-[#F5F5F5] whitespace-nowrap">{m.periodStart} → {m.periodEnd}</td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280] capitalize">{m.period}</td>
                    <td className="px-4 py-2.5 text-xs text-[#F5F5F5]">{m.tasksCompleted ?? '—'} / {m.tasksTotal ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[#F5F5F5]">{m.automationRate ? `${m.automationRate}%` : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[#F5F5F5]">{m.apiCostUsd ? `$${Number(m.apiCostUsd).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[#F5F5F5]">{m.humanInterventionRate ? `${m.humanInterventionRate}%` : '—'}</td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${(m.securityIncidents ?? 0) > 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                      {m.securityIncidents ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#6B7280] capitalize">{m.reportingPhase ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showLog && (
        <LogEntryDialog onClose={() => setShowLog(false)} onSaved={row => setEntries(prev => [row, ...prev])} />
      )}
    </div>
  )
}
