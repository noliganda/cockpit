'use client'
import { useState, useCallback } from 'react'
import { ChevronRight, AlertTriangle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

// ── Rollup indicator ─────────────────────────────────────────────────────────

interface RollupData {
  totalChildren: number
  completedChildren: number
  blockedChildren: number
  inProgressChildren: number
  allChildrenResolved: boolean
  hasBlockedChild: boolean
  hasOverdueChild: boolean
  parentSignal: string
}

export function RollupBadge({ rollup }: { rollup: RollupData }) {
  if (rollup.totalChildren === 0) return null

  const pct = Math.round((rollup.completedChildren / rollup.totalChildren) * 100)

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[#6B7280] tabular-nums">
        {rollup.completedChildren}/{rollup.totalChildren}
      </span>
      {/* Mini progress bar */}
      <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            rollup.allChildrenResolved ? 'bg-[#22C55E]' :
            rollup.hasBlockedChild ? 'bg-[#EF4444]' :
            'bg-[#3B82F6]'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {rollup.hasBlockedChild && (
        <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
      )}
      {rollup.hasOverdueChild && !rollup.hasBlockedChild && (
        <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
      )}
    </div>
  )
}

// ── Expand/collapse chevron ──────────────────────────────────────────────────

export function ExpandChevron({
  expanded,
  hasChildren,
  onClick,
}: {
  expanded: boolean
  hasChildren: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn(
        'w-4 h-4 flex items-center justify-center transition-colors shrink-0',
        hasChildren ? 'text-[#6B7280] hover:text-[#F5F5F5]' : 'text-[#2A2A2A] hover:text-[#4B5563]',
      )}
    >
      <ChevronRight
        className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-90')}
      />
    </button>
  )
}

// ── Subtask rows (inline expansion) ──────────────────────────────────────────

interface SubtaskExpansionProps {
  parentId: string
  expanded: boolean
  onEdit: (task: Task) => void
  onAddSubtask?: () => void
  /** Increment to force a re-fetch of subtasks */
  refreshKey?: number
}

function statusColor(status: string) {
  switch (status) {
    case 'Done': return 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]'
    case 'In Progress': return 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]'
    case 'Needs Review': return 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]'
    case 'Cancelled': return 'text-[#6B7280] bg-[rgba(107,114,128,0.08)]'
    default: return 'text-[#A0A0A0] bg-[rgba(255,255,255,0.06)]'
  }
}

export function SubtaskExpansion({ parentId, expanded, onEdit, onAddSubtask, refreshKey = 0 }: SubtaskExpansionProps) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loadedForKey, setLoadedForKey] = useState(-1)
  const [loading, setLoading] = useState(false)

  const needsLoad = expanded && loadedForKey !== refreshKey && !loading

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${parentId}/subtasks`)
      if (res.ok) {
        const data = await res.json() as { subtasks: Task[]; rollup: RollupData }
        setSubtasks(data.subtasks)
        setLoadedForKey(refreshKey)
      }
    } finally {
      setLoading(false)
    }
  }, [parentId, refreshKey])

  if (needsLoad) {
    void load()
  }

  if (!expanded) return null

  if (loading && subtasks.length === 0) {
    return (
      <tr><td colSpan={9} className="px-4 py-2 pl-12"><span className="text-xs text-[#4B5563]">Loading subtasks...</span></td></tr>
    )
  }

  // Build rows array — no Fragments, no whitespace between <tr> elements
  const rows: React.ReactNode[] = []

  for (const st of subtasks) {
    rows.push(
      <tr
        key={st.id}
        onClick={() => onEdit(st)}
        className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer bg-[rgba(255,255,255,0.01)]"
      >
        <td className="px-3 py-2" />
        <td className="px-4 py-2 pl-10"><div className="flex items-center gap-2"><span className="text-[10px] text-[#4B5563]">&#x2514;</span><span className="text-sm text-[#A0A0A0]">{st.title}</span></div></td>
        <td className="px-4 py-2" />
        <td className="px-4 py-2" />
        <td className="px-2 py-2" />
        <td className="px-2 py-2" />
        <td className="px-4 py-2"><span className={cn('text-xs px-2 py-0.5 rounded-full', statusColor(st.status))}>{st.status}</span></td>
        <td className="px-4 py-2">{st.dueDate && <span className="text-xs text-[#6B7280]">{st.dueDate}</span>}</td>
        <td className="px-4 py-2">{(st.assigneeName ?? st.assignee) && <span className="text-xs text-[#6B7280]">{st.assigneeName ?? st.assignee}</span>}</td>
      </tr>
    )
  }

  if (onAddSubtask) {
    rows.push(
      <tr key="__add" onClick={(e) => { e.stopPropagation(); onAddSubtask() }} className="hover:bg-[rgba(255,255,255,0.02)] cursor-pointer">
        <td className="px-3 py-1.5" />
        <td className="px-4 py-1.5 pl-10" colSpan={8}><span className="flex items-center gap-1.5 text-xs text-[#4B5563] hover:text-[#60A5FA] transition-colors"><Plus className="w-3 h-3" />Add subtask</span></td>
      </tr>
    )
  }

  if (rows.length === 0) return null

  // Return rows directly — no Fragment wrapper to avoid whitespace text nodes in <tbody>
  return rows as unknown as React.JSX.Element
}

// ── Mobile subtask cards ─────────────────────────────────────────────────────

export function SubtaskCards({ parentId, expanded, onEdit }: { parentId: string; expanded: boolean; onEdit: (task: Task) => void }) {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (loaded || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tasks/${parentId}/subtasks`)
      if (res.ok) {
        const data = await res.json() as { subtasks: Task[]; rollup: RollupData }
        setSubtasks(data.subtasks)
        setLoaded(true)
      }
    } finally {
      setLoading(false)
    }
  }, [parentId, loaded, loading])

  if (expanded && !loaded && !loading) {
    void load()
  }

  if (!expanded) return null

  if (loading) {
    return <p className="text-xs text-[#4B5563] pl-6 py-1">Loading...</p>
  }

  if (subtasks.length === 0) return null

  return (
    <div className="pl-4 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.06)] ml-3">
      {subtasks.map(st => (
        <div
          key={st.id}
          onClick={() => onEdit(st)}
          className="px-3 py-2 rounded-[6px] bg-[rgba(255,255,255,0.02)] cursor-pointer hover:bg-[rgba(255,255,255,0.04)]"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#A0A0A0]">{st.title}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full ml-auto', statusColor(st.status))}>
              {st.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Hook: track expanded parents + rollups ───────────────────────────────────

export function useSubtaskExpansion() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [rollups, setRollups] = useState<Map<string, RollupData>>(new Map())

  const toggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setRollup = useCallback((id: string, rollup: RollupData) => {
    setRollups(prev => {
      const next = new Map(prev)
      next.set(id, rollup)
      return next
    })
  }, [])

  return { expandedIds, toggle, rollups, setRollup }
}
