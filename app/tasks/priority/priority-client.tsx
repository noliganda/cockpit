'use client'

import { useState, useMemo, useEffect } from 'react'
import { type ScoredProject, type ScoredTask } from '@/lib/priority-engine'
import { GroupToggle, CollapsibleGroup, getSavedGrouping } from '@/components/group-toggle'
import { groupTasksBy, type GroupingProperty } from '@/lib/task-grouping'

// ─── Tier color palette (orange/gold/red accents per tier) ───────────────────
const TIER_COLORS: Record<number, string> = {
  1: '#B54334',
  2: '#C98A54',
  3: '#C9A94F',
  4: '#7A6F55',
}

const TIER_BG_DARK: Record<number, string> = {
  1: 'rgba(181,67,52,0.12)',
  2: 'rgba(201,138,84,0.12)',
  3: 'rgba(201,169,79,0.10)',
  4: 'rgba(122,111,85,0.10)',
}

const TIER_BORDER_DARK: Record<number, string> = {
  1: 'rgba(181,67,52,0.25)',
  2: 'rgba(201,138,84,0.25)',
  3: 'rgba(201,169,79,0.20)',
  4: 'rgba(122,111,85,0.20)',
}

// ─── Priority levels renamed for readability ─────────────────────────────────
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  P1: { label: 'Critical',  color: '#B54334' },
  P2: { label: 'Urgent',    color: '#C98A54' },
  P3: { label: 'High',      color: '#C9A94F' },
  P4: { label: 'Medium',    color: '#5F7A72' },
  P5: { label: 'Queue',     color: '#5C5340' },
  P6: { label: 'Queue',     color: '#4A4234' },
  P7: { label: 'Queue',     color: '#4A4234' },
  P8: { label: 'Queue',     color: '#4A4234' },
}

const FLAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  FAMILY:           { bg: 'rgba(181,67,52,0.15)',   color: '#B54334', label: 'Family' },
  CRITICAL_PATH:    { bg: 'rgba(201,138,84,0.15)',   color: '#C98A54', label: 'Critical' },
  BLOCKING:         { bg: 'rgba(95,122,114,0.15)',   color: '#6E8B7E', label: 'Blocking' },
  DEADLINE_IMMINENT:{ bg: 'rgba(190,24,93,0.15)',   color: '#B0584A', label: 'Due Soon' },
}

const QUADRANT_ICONS: Record<string, string> = {
  Q1: '🔥', Q2: '🎯', Q3: '⚡', Q4: '📦',
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface PriorityClientProps {
  projects: ScoredProject[]
  tasks:    ScoredTask[]
  stats: {
    p1Tasks:        number
    revenueAtRisk:  number
    familyProjects: number
    blockedTasks:   number
    timeAllocation: { tier1Percent: number; tier2Percent: number; tier3Percent: number; tier4Percent: number }
  }
  workspaceId: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: 0,
      background: TIER_COLORS[tier], color: '#E8DFCE',
      fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
      flexShrink: 0,
    }}>
      {tier}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META['P5']
  const isHighPriority = ['P1', 'P2', 'P3'].includes(priority)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 0,
      background: isHighPriority ? meta.color + '22' : 'rgba(167,155,120,0.13)',
      border: `1px solid ${isHighPriority ? meta.color + '44' : 'rgba(167,155,120,0.22)'}`,
      color: isHighPriority ? meta.color : '#7A6F55',
      fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
      letterSpacing: 0.3,
    }}>
      {meta.label}
    </span>
  )
}

function FlagChip({ flag }: { flag: string }) {
  const s = FLAG_STYLES[flag]
  if (!s) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 6px', borderRadius: 0,
      background: s.bg, color: s.color,
      fontSize: 9, fontWeight: 600,
    }}>
      {s.label}
    </span>
  )
}

function EffortImpactDot({ effort, impact }: { effort: string; impact: string }) {
  const eMap: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }
  const iMap: Record<string, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }
  const e = eMap[effort] ?? 0
  const i = iMap[impact] ?? 0
  const color = i >= 2 && e <= 1 ? '#3E7A70' : i >= 1 && e <= 1 ? '#C9A94F' : i <= 0 && e >= 2 ? '#B54334' : '#5F7A72'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#7A6F55', fontFamily: 'monospace' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {effort[0]}/{impact[0]}
    </span>
  )
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 3, background: 'rgba(167,155,120,0.18)', borderRadius: 0, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', background: color, borderRadius: 0 }} />
    </div>
  )
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────
interface StatsBarProps {
  stats: { p1Tasks: number; revenueAtRisk: number; familyProjects: number; blockedTasks: number }
}
function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { label: 'Critical Tasks',    value: stats.p1Tasks,                                       color: '#B54334', icon: '🔥' },
    { label: 'Revenue at Risk',   value: `$${(stats.revenueAtRisk / 1000).toFixed(0)}k`,      color: '#3E7A70', icon: '💰' },
    { label: 'Family Projects',   value: stats.familyProjects,                                color: '#C98A54', icon: '🏠' },
    { label: 'Blocked',           value: stats.blockedTasks, color: stats.blockedTasks > 0 ? '#B54334' : '#5C5340', icon: '🚫' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
      {items.map((s, i) => (
        <div key={i} style={{
          background: '#1A1510', borderRadius: 0, padding: '14px 16px',
          border: '1px solid rgba(167,155,120,0.13)',
        }}>
          <div style={{ fontSize: 11, color: '#7A6F55', fontWeight: 500, marginBottom: 6 }}>{s.icon} {s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'monospace', lineHeight: 1 }}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Task Card (shared for kanban + grouped views) ───────────────────────────
function TaskCard({ task }: { task: ScoredTask }) {
  return (
    <div style={{
      background: '#1A1510',
      borderRadius: 0, padding: '12px 14px',
      border: task.priority === 'P1'
        ? '1px solid rgba(181,67,52,0.30)'
        : '1px solid rgba(167,155,120,0.15)',
      boxShadow: task.priority === 'P1' ? '0 0 12px rgba(181,67,52,0.08)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <TierBadge tier={task.projectTier} />
        <span style={{ marginLeft: 'auto' }}>
          <EffortImpactDot effort={task.effort} impact={task.impact} />
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#E8DFCE', lineHeight: 1.35, marginBottom: 4 }}>
        {QUADRANT_ICONS[task.quadrant]} {task.title}
      </div>
      <div style={{ fontSize: 11, color: '#5C5340', marginBottom: 8 }}>
        {task.parentProject.name}
      </div>
      {task.flags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {task.flags.map(f => <FlagChip key={f} flag={f} />)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PriorityBadge priority={task.priority} />
        {task.daysRemaining !== null && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: 'monospace',
            color: task.daysRemaining <= 0 ? '#B54334' : task.daysRemaining <= 3 ? '#C98A54' : '#5C5340',
          }}>
            {task.daysRemaining <= 0 ? 'OVERDUE' : `${task.daysRemaining}d`}
          </span>
        )}
        <span style={{
          fontSize: 9, padding: '2px 6px', borderRadius: 0,
          background: task.status === 'in_progress' ? 'rgba(95,122,114,0.15)' : task.status === 'blocked' ? 'rgba(181,67,52,0.15)' : 'rgba(167,155,120,0.11)',
          color: task.status === 'in_progress' ? '#6E8B7E' : task.status === 'blocked' ? '#B54334' : '#7A6F55',
          fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3,
        }}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}

// ─── Kanban View ─────────────────────────────────────────────────────────────
function KanbanView({ tasks }: { tasks: ScoredTask[] }) {
  const cols = [
    { key: 'P1', label: 'Critical' },
    { key: 'P2', label: 'Urgent'   },
    { key: 'P3', label: 'High'     },
    { key: 'P4', label: 'Medium'   },
    { key: 'P5+', label: 'Queue'   },
  ]

  const grouped = useMemo(() => {
    const g: Record<string, ScoredTask[]> = { P1: [], P2: [], P3: [], P4: [], 'P5+': [] }
    tasks.forEach(t => {
      const bucket = ['P1', 'P2', 'P3', 'P4'].includes(t.priority) ? t.priority : 'P5+'
      g[bucket].push(t)
    })
    return g
  }, [tasks])

  return (
    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, minHeight: 420 }}>
      {cols.map(col => (
        <div key={col.key} style={{ minWidth: 250, maxWidth: 290, flex: '1 0 250px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, padding: '7px 12px', borderRadius: 0,
            background: TIER_BG_DARK[col.key === 'P1' ? 1 : col.key === 'P2' ? 2 : col.key === 'P3' ? 3 : 4],
            border: `1px solid ${TIER_BORDER_DARK[col.key === 'P1' ? 1 : col.key === 'P2' ? 2 : col.key === 'P3' ? 3 : 4]}`,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: PRIORITY_META[col.key === 'P5+' ? 'P5' : col.key]?.color || '#7A6F55',
            }}>
              {col.label}
            </span>
            <span style={{
              fontSize: 10, color: '#7A6F55', fontWeight: 500,
              background: 'rgba(167,155,120,0.13)', padding: '1px 6px', borderRadius: 0,
            }}>
              {grouped[col.key].length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[col.key].map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
            {grouped[col.key].length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#4A4234', fontSize: 12, fontStyle: 'italic' }}>
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Grouped Task View (for kanban tab when grouping is active) ──────────────
function GroupedTaskView({ tasks, grouping }: { tasks: ScoredTask[]; grouping: GroupingProperty }) {
  const groups = useMemo(() => {
    const keyFn = (t: ScoredTask) => {
      switch (grouping) {
        case 'project':  return t.parentProject.name
        case 'status':   return t.status.replace('_', ' ')
        case 'assignee': return 'All' // ScoredTask has no assignee field
        default:         return 'All'
      }
    }
    return groupTasksBy(tasks, keyFn)
  }, [tasks, grouping])

  return (
    <div>
      {groups.map(group => (
        <CollapsibleGroup key={group.key} group={group}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
            {group.tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </CollapsibleGroup>
      ))}
    </div>
  )
}

// ─── Project Health View ──────────────────────────────────────────────────────
function ProjectHealthView({ projects }: { projects: ScoredProject[] }) {
  const sorted = useMemo(() =>
    projects.filter(p => p.status === 'active').sort((a, b) => a.tier - b.tier || b.urgencyScore - a.urgencyScore),
    [projects]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map(proj => {
        const daysRemaining = proj.deadline
          ? Math.ceil((proj.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
        const riskColor = daysRemaining === null ? '#5C5340' : daysRemaining <= 3 ? '#B54334' : daysRemaining <= 14 ? '#C98A54' : '#3E7A70'

        return (
          <div key={proj.id} style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr 100px 64px 100px',
            alignItems: 'center', gap: 16,
            padding: '12px 16px',
            background: TIER_BG_DARK[proj.tier],
            borderRadius: 0, border: `1px solid ${TIER_BORDER_DARK[proj.tier]}`,
          }}>
            <TierBadge tier={proj.tier} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E8DFCE' }}>{proj.name}</div>
              <div style={{ fontSize: 10, color: '#5C5340', marginTop: 2, fontFamily: 'monospace' }}>
                Urgency {proj.urgencyScore.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#5C5340', marginBottom: 4, fontFamily: 'monospace' }}>
                {proj.percentComplete}% done
              </div>
              <ProgressBar percent={proj.percentComplete} color={TIER_COLORS[proj.tier]} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: riskColor, fontFamily: 'monospace', lineHeight: 1 }}>
                {daysRemaining !== null ? daysRemaining : '—'}
              </div>
              <div style={{ fontSize: 9, color: '#5C5340', marginTop: 2 }}>days</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E8DFCE', fontFamily: 'monospace' }}>
                {proj.profitabilityEstimate ? `$${(proj.profitabilityEstimate / 1000).toFixed(0)}k` : '—'}
              </div>
              <div style={{ fontSize: 9, color: '#5C5340', marginTop: 2 }}>revenue</div>
            </div>
          </div>
        )
      })}
      {sorted.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#4A4234', fontSize: 13 }}>
          No active projects in this workspace
        </div>
      )}
    </div>
  )
}

// ─── Allocation View ──────────────────────────────────────────────────────────
function AllocationView({ stats }: { stats: { timeAllocation: { tier1Percent: number; tier2Percent: number; tier3Percent: number; tier4Percent: number } } }) {
  const tiers = [
    { label: 'Tier 1 · Critical', target: '60–80%', actual: stats.timeAllocation.tier1Percent, color: TIER_COLORS[1] },
    { label: 'Tier 2 · Urgent',   target: '15–30%', actual: stats.timeAllocation.tier2Percent, color: TIER_COLORS[2] },
    { label: 'Tier 3 · High',     target: '5–10%',  actual: stats.timeAllocation.tier3Percent, color: TIER_COLORS[3] },
    { label: 'Tier 4 · Queue',    target: '0%',      actual: stats.timeAllocation.tier4Percent, color: TIER_COLORS[4] },
  ]
  const total = tiers.reduce((s, t) => s + t.actual, 0) || 1

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
      {/* Donut */}
      <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: 130, height: 130 }}>
          {(() => {
            let offset = 0
            return tiers.filter(t => t.actual > 0).map((t, i) => {
              const pct = (t.actual / total) * 100
              const el = (
                <circle key={i} cx="50" cy="50" r="38" fill="none"
                  stroke={t.color} strokeWidth="12"
                  strokeDasharray={`${Math.max(0, pct * 2.388 - 2)} 300`}
                  strokeDashoffset={-offset * 2.388}
                  strokeLinecap="round" opacity={0.9}
                />
              )
              offset += pct
              return el
            })
          })()}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: TIER_COLORS[1], fontFamily: 'monospace', lineHeight: 1 }}>
            {tiers[0].actual}%
          </span>
          <span style={{ fontSize: 9, color: '#5C5340', marginTop: 2 }}>Tier 1</span>
        </div>
      </div>

      {/* Legend bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {tiers.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 9, height: 9, borderRadius: 0, background: t.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A79B78', minWidth: 100 }}>{t.label}</span>
            <div style={{ flex: 1, height: 5, background: 'rgba(167,155,120,0.18)', borderRadius: 0, overflow: 'hidden' }}>
              <div style={{ width: `${t.actual}%`, height: '100%', background: t.color, borderRadius: 0 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.color, fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
              {t.actual}%
            </span>
            <span style={{ fontSize: 9, color: '#4A4234', fontFamily: 'monospace', minWidth: 44 }}>({t.target})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PriorityClient({ projects, tasks, stats }: PriorityClientProps) {
  const [activeView, setActiveView] = useState<'kanban' | 'projects' | 'allocation'>('kanban')
  const [grouping, setGrouping] = useState<GroupingProperty>('none')
  useEffect(() => { setGrouping(getSavedGrouping()) }, [])

  const views = [
    { key: 'kanban'     as const, label: 'Task Board'     },
    { key: 'projects'   as const, label: 'Project Health' },
    { key: 'allocation' as const, label: 'Allocation'     },
  ]

  return (
    <div style={{ background: '#14100C', minHeight: '100vh', padding: '24px 28px', color: '#E8DFCE' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#E8DFCE', margin: 0, letterSpacing: -0.5 }}>
            Task Prioritization Engine
          </h1>
          <p style={{ fontSize: 11, color: '#5C5340', margin: '4px 0 0', fontFamily: 'monospace' }}>
            Calculated: {new Date().toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Group toggle */}
          {activeView === 'kanban' && (
            <GroupToggle
              value={grouping}
              onChange={setGrouping}
              options={['project', 'status']}
            />
          )}

          {/* View tabs */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(167,155,120,0.09)', borderRadius: 0, padding: 3 }}>
            {views.map(v => (
              <button key={v.key} onClick={() => setActiveView(v.key)} style={{
                padding: '6px 16px', borderRadius: 0, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: activeView === v.key ? '#251D16' : 'transparent',
                color: activeView === v.key ? '#E8DFCE' : '#5C5340',
                boxShadow: activeView === v.key ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
              }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Views */}
      {activeView === 'kanban' && (
        grouping !== 'none'
          ? <GroupedTaskView tasks={tasks} grouping={grouping} />
          : <KanbanView tasks={tasks} />
      )}
      {activeView === 'projects' && <ProjectHealthView projects={projects} />}
      {activeView === 'allocation' && (
        <div style={{ background: '#1A1510', borderRadius: 0, padding: 24, border: '1px solid rgba(167,155,120,0.13)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#A79B78', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Time Allocation vs Targets
          </h3>
          <AllocationView stats={stats} />
        </div>
      )}
    </div>
  )
}
