'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GROUPING_OPTIONS, type GroupingProperty, type TaskGroup } from '@/lib/task-grouping'

// ─── Session-persisted collapse state ────────────────────────────────────────

const COLLAPSE_KEY = 'task-group-collapsed'
const GROUPING_KEY = 'task-group-property'

function getCollapsedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = sessionStorage.getItem(COLLAPSE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveCollapsedSet(set: Set<string>) {
  try {
    sessionStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]))
  } catch { /* noop */ }
}

export function getSavedGrouping(): GroupingProperty {
  if (typeof window === 'undefined') return 'none'
  try {
    const val = sessionStorage.getItem(GROUPING_KEY) as GroupingProperty | null
    return val && GROUPING_OPTIONS.some(o => o.value === val) ? val : 'none'
  } catch {
    return 'none'
  }
}

function saveGrouping(val: GroupingProperty) {
  try {
    sessionStorage.setItem(GROUPING_KEY, val)
  } catch { /* noop */ }
}

// ─── GroupToggle dropdown ────────────────────────────────────────────────────

interface GroupToggleProps {
  value: GroupingProperty
  onChange: (v: GroupingProperty) => void
  /** Which options to show (default: all) */
  options?: GroupingProperty[]
}

export function GroupToggle({ value, onChange, options }: GroupToggleProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = options
    ? GROUPING_OPTIONS.filter(o => o.value === 'none' || options.includes(o.value))
    : GROUPING_OPTIONS

  const current = filtered.find(o => o.value === value) ?? filtered[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-[6px] border transition-colors',
          value !== 'none'
            ? 'bg-[rgba(139,92,246,0.12)] border-[rgba(139,92,246,0.35)] text-[#A78BFA]'
            : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]'
        )}
      >
        <Layers className="w-3 h-3" />
        {value === 'none' ? 'Group' : `Group: ${current.label}`}
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[6px] overflow-hidden shadow-lg">
          {filtered.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                saveGrouping(opt.value)
                if (opt.value === 'none') {
                  // Clear collapse state when ungrouping
                  sessionStorage.removeItem(COLLAPSE_KEY)
                }
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2',
                value === opt.value
                  ? 'text-[#F5F5F5] bg-[rgba(255,255,255,0.04)]'
                  : 'text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F5F5]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Collapsible group section ───────────────────────────────────────────────

interface CollapsibleGroupProps<T> {
  group: TaskGroup<T>
  children: React.ReactNode
}

export function CollapsibleGroup<T>({ group, children }: CollapsibleGroupProps<T>) {
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>(getCollapsedSet)
  const isCollapsed = collapsedSet.has(group.key)

  const toggle = useCallback(() => {
    setCollapsedSet(prev => {
      const next = new Set(prev)
      if (next.has(group.key)) next.delete(group.key)
      else next.add(group.key)
      saveCollapsedSet(next)
      return next
    })
  }, [group.key])

  return (
    <div className="mb-3">
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full py-2 px-3 rounded-[6px] hover:bg-[rgba(255,255,255,0.03)] transition-colors group/header"
      >
        {isCollapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-[#6B7280] transition-transform" />
          : <ChevronDown className="w-3.5 h-3.5 text-[#6B7280] transition-transform" />
        }
        <span className="text-sm font-semibold text-[#F5F5F5]">{group.label}</span>
        <span className="text-xs text-[#4B5563] font-medium ml-1">({group.count})</span>
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[9999px] opacity-100'
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { getCollapsedSet, saveGrouping }
