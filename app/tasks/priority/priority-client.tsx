'use client'

import { useState, useMemo } from 'react'
import { type ScoredProject, type ScoredTask } from '@/lib/priority-engine'

// Color constants
const TIER_COLORS: Record<number, string> = {
  1: '#E63946',
  2: '#F4A261',
  3: '#457B9D',
  4: '#6B7280',
}

const TIER_BG: Record<number, string> = {
  1: 'rgba(230,57,70,0.08)',
  2: 'rgba(244,162,97,0.08)',
  3: 'rgba(69,123,157,0.08)',
  4: 'rgba(107,114,128,0.08)',
}

const PRIORITY_COLORS: Record<string, string> = {
  P1: '#E63946',
  P2: '#F4A261',
  P3: '#E9C46A',
  P4: '#457B9D',
  P5: '#6B7280',
  P6: '#9CA3AF',
  P7: '#D1D5DB',
  P8: '#E5E7EB',
}

const BIZ_COLORS: Record<string, string> = {
  OM: '#2A9D8F',
  BF: '#E76F51',
  Korus: '#264653',
}

const BIZ_LABELS: Record<string, string> = {
  OM: 'OM Film',
  BF: 'Family',
  Korus: 'Chorus Group',
}

const FLAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  FAMILY: { bg: '#FDE8E8', color: '#E63946', label: 'Family' },
  CRITICAL_PATH: { bg: '#FEF3C7', color: '#B45309', label: 'Critical' },
  BLOCKING: { bg: '#DBEAFE', color: '#1E40AF', label: 'Blocking' },
  DEADLINE_IMMINENT: { bg: '#FCE7F3', color: '#BE185D', label: 'Due Soon' },
}

const QUADRANT_ICONS: Record<string, string> = {
  Q1: '🔥',
  Q2: '🎯',
  Q3: '⚡',
  Q4: '📦',
}

// Component Props
interface PriorityClientProps {
  projects: ScoredProject[]
  tasks: ScoredTask[]
  stats: {
    p1Tasks: number
    revenueAtRisk: number
    familyProjects: number
    blockedTasks: number
    timeAllocation: {
      tier1Percent: number
      tier2Percent: number
      tier3Percent: number
      tier4Percent: number
    }
  }
  workspaceId: string
}

// Sub-components
function TierBadge({ tier }: { tier: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 6,
        background: TIER_COLORS[tier],
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {tier}
    </span>
  )
}

function PriorityPill({ priority }: { priority: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 20,
        background: PRIORITY_COLORS[priority] || '#E5E7EB',
        color: ['P1', 'P2', 'P3'].includes(priority) ? '#fff' : '#1F2937',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: 0.5,
      }}
    >
      {priority}
    </span>
  )
}

function BizTag({ business }: { business: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        background: (BIZ_COLORS[business] || '#9CA3AF') + '18',
        color: BIZ_COLORS[business] || '#9CA3AF',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {BIZ_LABELS[business] || business}
    </span>
  )
}

function FlagChip({ flag }: { flag: string }) {
  const s = FLAG_STYLES[flag]
  if (!s) return null
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  )
}

function EffortImpactDot({ effort, impact }: { effort: string; impact: string }) {
  const eMap: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }
  const iMap: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }
  const e = eMap[effort] ?? 0
  const i = iMap[impact] ?? 0
  const color =
    i >= 2 && e <= 1 ? '#2A9D8F' : i >= 1 && e <= 1 ? '#E9C46A' : i <= 0 && e >= 2 ? '#E63946' : '#457B9D'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {effort[0]}/{impact[0]}
    </span>
  )
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(percent, 100)}%`,
          height: '100%',
          background: color || '#2A9D8F',
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }}
      />
    </div>
  )
}

// Views
function KanbanView({ tasks, filter }: { tasks: ScoredTask[]; filter: string }) {
  const cols = ['P1', 'P2', 'P3', 'P4', 'P5+']
  const grouped = useMemo(() => {
    const g: Record<string, ScoredTask[]> = {
      P1: [],
      P2: [],
      P3: [],
      P4: [],
      'P5+': [],
    }
    tasks.forEach(t => {
      if (filter !== 'ALL' && t.parentProject.business !== filter) return
      const bucket = ['P1', 'P2', 'P3', 'P4'].includes(t.priority) ? t.priority : 'P5+'
      g[bucket].push(t)
    })
    return g
  }, [tasks, filter])

  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, minHeight: 400 }}>
      {cols.map(col => (
        <div
          key={col}
          style={{
            minWidth: 260,
            maxWidth: 300,
            flex: '1 0 260px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background:
                col === 'P1'
                  ? 'rgba(230,57,70,0.06)'
                  : col === 'P2'
                    ? 'rgba(244,162,97,0.06)'
                    : 'rgba(69,123,157,0.04)',
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: PRIORITY_COLORS[col === 'P5+' ? 'P5' : col],
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {col}
            </span>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>{grouped[col].length} tasks</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[col].map(task => (
              <div
                key={task.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 10,
                  padding: '14px 16px',
                  border: '1px solid #F3F4F6',
                  boxShadow: task.priority === 'P1' ? '0 0 0 1px rgba(230,57,70,0.15), 0 2px 8px rgba(230,57,70,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <TierBadge tier={task.projectTier} />
                  <BizTag business={task.parentProject.business} />
                  <span style={{ marginLeft: 'auto' }}>
                    <EffortImpactDot effort={task.effort} impact={task.impact} />
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', lineHeight: 1.35, marginBottom: 6 }}>
                  {QUADRANT_ICONS[task.quadrant]} {task.title}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>{task.parentProject.name}</div>
                {task.flags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {task.flags.map(f => (
                      <FlagChip key={f} flag={f} />
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
                    {task.estimateHours}h est.
                  </span>
                  {task.daysRemaining !== null && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: task.daysRemaining <= 3 ? '#E63946' : task.daysRemaining <= 7 ? '#F4A261' : '#6B7280',
                      }}
                    >
                      {task.daysRemaining <= 0 ? 'OVERDUE' : `${task.daysRemaining}d left`}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: task.status === 'in_progress' ? '#DBEAFE' : task.status === 'blocked' ? '#FDE8E8' : '#F3F4F6',
                      color: task.status === 'in_progress' ? '#1E40AF' : task.status === 'blocked' ? '#E63946' : '#6B7280',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                    }}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {grouped[col].length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#D1D5DB', fontSize: 12 }}>No tasks</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProjectHealthView({ projects, filter }: { projects: ScoredProject[]; filter: string }) {
  const filtered = useMemo(() => {
    return projects.filter(p => p.status === 'active' && (filter === 'ALL' || p.business === filter)).sort((a, b) => a.tier - b.tier || b.urgencyScore - a.urgencyScore)
  }, [projects, filter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {filtered.map(proj => {
        const daysRemaining = proj.deadline ? Math.ceil((proj.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
        const riskColor = daysRemaining === null ? '#6B7280' : daysRemaining <= 3 ? '#E63946' : daysRemaining <= 14 ? '#F4A261' : '#2A9D8F'

        return (
          <div
            key={proj.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 100px 80px 100px 80px',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: TIER_BG[proj.tier],
              borderRadius: 10,
              border: `1px solid ${TIER_COLORS[proj.tier]}12`,
            }}
          >
            <TierBadge tier={proj.tier} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{proj.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                <BizTag business={proj.business} />
                {proj.projectType === 'family' && <FlagChip flag="FAMILY" />}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3, fontFamily: "'JetBrains Mono', monospace" }}>{proj.percentComplete}% done</div>
              <ProgressBar percent={proj.percentComplete} color={TIER_COLORS[proj.tier]} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: riskColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                {daysRemaining !== null ? daysRemaining : '—'}
              </div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>days left</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937', fontFamily: "'JetBrains Mono', monospace" }}>
                {proj.profitabilityEstimate ? `$${(proj.profitabilityEstimate / 1000).toFixed(0)}k` : '—'}
              </div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>revenue</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#457B9D', fontFamily: "'JetBrains Mono', monospace" }}>0</div>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>open tasks</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AllocationView({ stats }: { stats: { timeAllocation: { tier1Percent: number; tier2Percent: number; tier3Percent: number; tier4Percent: number } } }) {
  const tiers = [
    { tier: 1, label: 'Tier 1', target: '60–80%', actual: stats.timeAllocation.tier1Percent, color: TIER_COLORS[1] },
    { tier: 2, label: 'Tier 2', target: '15–30%', actual: stats.timeAllocation.tier2Percent, color: TIER_COLORS[2] },
    { tier: 3, label: 'Tier 3', target: '5–10%', actual: stats.timeAllocation.tier3Percent, color: TIER_COLORS[3] },
    { tier: 4, label: 'Tier 4', target: '0%', actual: stats.timeAllocation.tier4Percent, color: TIER_COLORS[4] },
  ]

  const total = tiers.reduce((s, t) => s + t.actual, 0)

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {/* Donut */}
      <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: 140, height: 140 }}>
          {(() => {
            let offset = 0
            return tiers
              .filter(t => t.actual > 0)
              .map((t, i) => {
                const pct = (t.actual / total) * 100
                const gap = 2
                const el = (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke={t.color}
                    strokeWidth="12"
                    strokeDasharray={`${Math.max(0, pct * 2.388 - gap)} ${300}`}
                    strokeDashoffset={-offset * 2.388}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                )
                offset += pct
                return el
              })
          })()}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 800, color: '#1F2937', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {tiers[0].actual}%
          </span>
          <span style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>Tier 1</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {tiers.map(t => (
          <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', minWidth: 50 }}>{t.label}</span>
            <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${t.actual}%`, height: '100%', background: t.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.color, fontFamily: "'JetBrains Mono', monospace", minWidth: 36, textAlign: 'right' }}>
              {t.actual}%
            </span>
            <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>({t.target})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsBar({ stats }: { stats: any }) {
  const items = [
    { label: 'P1 Tasks', value: stats.p1Tasks, color: '#E63946', icon: '🔥' },
    { label: 'Revenue at Risk', value: `$${(stats.revenueAtRisk / 1000).toFixed(0)}k`, color: '#2A9D8F', icon: '💰' },
    { label: 'Family Projects', value: stats.familyProjects, color: '#E76F51', icon: '🏠' },
    { label: 'Blocked', value: stats.blockedTasks, color: stats.blockedTasks > 0 ? '#E63946' : '#6B7280', icon: '🚫' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map((s, i) => (
        <div
          key={i}
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '16px 18px',
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginBottom: 6 }}>
            {s.icon} {s.label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// Main Component
export function PriorityClient({ projects, tasks, stats }: PriorityClientProps) {
  const [activeView, setActiveView] = useState('kanban')
  const [bizFilter, setBizFilter] = useState('ALL')

  const views = [
    { key: 'kanban', label: 'Task Board' },
    { key: 'projects', label: 'Project Health' },
    { key: 'allocation', label: 'Allocation' },
  ]

  const filters = ['ALL', 'OM', 'BF', 'Korus']

  return (
    <div
      style={{
        fontFamily: "'DM Sans', 'SF Pro Display', -apple-system, sans-serif",
        background: '#FAFAFA',
        minHeight: '100vh',
        padding: '24px 28px',
        color: '#1F2937',
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: -0.5 }}>
            Task Prioritization Engine
          </h1>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: '4px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
            Last calculated: {new Date().toLocaleString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setBizFilter(f)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                background: bizFilter === f ? (f === 'ALL' ? '#111827' : BIZ_COLORS[f]) : '#F3F4F6',
                color: bizFilter === f ? '#fff' : '#6B7280',
                transition: 'all 0.15s ease',
              }}
            >
              {f === 'ALL' ? 'All' : BIZ_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#F3F4F6', borderRadius: 10, padding: 3, width: 'fit-content' }}>
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              background: activeView === v.key ? '#FFFFFF' : 'transparent',
              color: activeView === v.key ? '#111827' : '#9CA3AF',
              boxShadow: activeView === v.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {activeView === 'kanban' && <KanbanView tasks={tasks} filter={bizFilter} />}
      {activeView === 'projects' && <ProjectHealthView projects={projects} filter={bizFilter} />}
      {activeView === 'allocation' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, border: '1px solid #F3F4F6' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Time Allocation vs Targets</h3>
          <AllocationView stats={stats} />
        </div>
      )}
    </div>
  )
}
