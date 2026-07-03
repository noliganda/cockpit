'use client'
import { useCallback, useEffect, useState } from 'react'
import { Send, RefreshCw, Bot, AlertTriangle, PauseCircle, Pause, Play } from 'lucide-react'

// ── Dispatch queue panel (spec §8 Phase 4) ────────────────────────────────────
// Read-only monitoring over GET /api/dispatch/status: engine state, agent
// operators (slots/budget/pause), the wakeup queue with stale flags, and
// active harness sessions. Auto-refreshes every 30s.

interface OperatorRow {
  id: string
  name: string
  status: string
  pauseReason: string | null
  adapterType: string | null
  adapterRegistered: boolean
  maxConcurrent: number
  activeRunCount: number
  budgetMonthlyCents: number
  spentMonthlyCents: number
}

interface QueueItem {
  id: string
  status: string
  source: string
  operatorId: string
  taskId: string | null
  task: { id: string; title: string; status: string; workspaceId: string } | null
  requestedAt: string
  claimedAt: string | null
  idleMs: number
  staleThresholdMs: number
  isStale: boolean
}

interface SessionRow {
  id: string
  operatorId: string
  taskId: string
  task: { id: string; title: string; status: string; workspaceId: string } | null
  adapterType: string
  sessionDisplayId: string | null
  lastCheckpointAt: string
}

interface StatusPayload {
  dispatchEnabled: boolean
  state: { lastCycleAt: string | null; lastCascadeAt: string | null; paused: boolean; pausedAt: string | null; pausedBy: string | null }
  operators: OperatorRow[]
  queue: { counts: { queued: number; claimed: number; running: number }; items: QueueItem[] }
  staleClaims: QueueItem[]
  activeSessions: SessionRow[]
}

const WORKSPACE_ACCENT: Record<string, string> = {
  'byron-film': '#D4A017',
  'korus': '#008080',
  'personal': '#F97316',
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const mins = Math.round((Date.now() - t) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function idle(ms: number): string {
  const mins = Math.floor(ms / 60_000)
  return mins < 1 ? '<1m' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const QUEUE_STATUS_COLOR: Record<string, string> = {
  queued: '#A0A0A0',
  claimed: '#F59E0B',
  running: '#3B82F6',
}

function StatCard({ label, value, sublabel, accent }: { label: string; value: string | number; sublabel?: string; accent?: string }) {
  return (
    <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] p-4">
      <div className="font-mono text-[28px] font-semibold tabular-nums leading-none" style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="mt-2 text-xs text-[#A0A0A0]">{label}</div>
      {sublabel && <div className="mt-0.5 text-[11px] text-[#6B7280]">{sublabel}</div>}
    </div>
  )
}

export function DispatchClient() {
  const [data, setData] = useState<StatusPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [toggling, setToggling] = useState(false)
  // Separate from the poll `error`: a failed SAFETY action must not be
  // reworded as a refresh problem nor swept away by the next successful poll.
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch('/api/dispatch/status')
      if (!res.ok) throw new Error(`status ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (err) {
      // Keep the last good data on screen; a monitoring panel shouldn't blank
      // on a transient poll failure — surface it as a banner instead.
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (manual) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  const togglePause = useCallback(async (paused: boolean) => {
    setToggling(true)
    try {
      const res = await fetch('/api/dispatch/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused }),
      })
      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'not permitted (session expired or guest)' : `status ${res.status}`)
      setActionError(null)
      await load()
    } catch (err) {
      setActionError(`${paused ? 'Pause' : 'Resume'} failed (${err instanceof Error ? err.message : String(err)}) — dispatching state is UNCHANGED`)
    } finally {
      setToggling(false)
    }
  }, [load])

  if (!data) {
    return error
      ? <div className="p-8 text-sm text-[#EF4444]">Failed to load dispatch status: {error}</div>
      : <div className="p-8 text-sm text-[#6B7280]">Loading dispatch status…</div>
  }

  const { counts } = data.queue
  // Count stale from the rows actually displayed so the stat can never point
  // at claims the queue table doesn't show.
  const staleCount = data.queue.items.filter(q => q.isStale).length

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-[#F5F5F5]">Dispatch</h1>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
            data.dispatchEnabled
              ? 'text-[#22C55E] border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)]'
              : 'text-[#6B7280] border-[rgba(255,255,255,0.10)] bg-[#141414]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${data.dispatchEnabled ? 'bg-[#22C55E]' : 'bg-[#4B5563]'}`} />
            {data.dispatchEnabled ? 'engine on' : 'engine off (this host)'}
          </span>
          {data.state.paused && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#F59E0B] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]">
              <Pause size={11} strokeWidth={2} />
              paused{data.state.pausedBy ? ` by ${data.state.pausedBy}` : ''}{data.state.pausedAt ? ` ${timeAgo(data.state.pausedAt)}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#6B7280]">cycle {timeAgo(data.state.lastCycleAt)} · cascade {timeAgo(data.state.lastCascadeAt)}</span>
          <button
            onClick={() => togglePause(!data.state.paused)}
            disabled={toggling}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-[6px] transition-colors disabled:opacity-40 ${
              data.state.paused
                ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.3)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.14)]'
                : 'bg-[#1A1A1A] border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222]'
            }`}
          >
            {/* Amber icon differentiates this fleet-wide control from the
                visually-identical Refresh button beside it. */}
            {data.state.paused ? <Play size={14} strokeWidth={1.5} /> : <Pause size={14} strokeWidth={1.5} className="text-[#F59E0B]" />}
            {data.state.paused ? 'Resume dispatching' : 'Pause dispatching'}
          </button>
          <button
            onClick={() => load(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between px-3 py-2 text-[12px] text-[#EF4444] bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.25)] rounded-[6px]">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-3 text-[#6B7280] hover:text-[#F5F5F5]">dismiss</button>
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 text-[12px] text-[#F59E0B] bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.25)] rounded-[6px]">
          Last refresh failed ({error}) — showing previous data; retrying automatically.
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard label="Queued" value={counts.queued} sublabel="awaiting a cycle" />
        <StatCard label="Claimed" value={counts.claimed} sublabel="cycle in flight" />
        <StatCard label="Running" value={counts.running} sublabel="harness working" />
        <StatCard label="Stale" value={staleCount} sublabel="past adapter threshold" accent={staleCount > 0 ? '#EF4444' : undefined} />
        <StatCard label="Active sessions" value={data.activeSessions.length} sublabel="operator × task" />
      </div>

      {/* Operators */}
      <h2 className="text-base font-semibold text-[#F5F5F5] mb-3">Operators</h2>
      <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.02em] text-[#6B7280] border-b border-[rgba(255,255,255,0.04)]">
              <th className="px-3 py-2.5 font-medium">Operator</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Adapter</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Slots</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Budget</th>
            </tr>
          </thead>
          <tbody>
            {data.operators.map(op => (
              <tr key={op.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-b-0 hover:bg-[#1A1A1A]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bot size={16} strokeWidth={1.5} className="text-[#6B7280]" />
                    <span className="text-[#F5F5F5]">{op.name}</span>
                    <span className="font-mono text-[11px] text-[#6B7280]">{op.id}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="font-mono text-[12px] text-[#A0A0A0]">{op.adapterType ?? '—'}</span>
                  {op.adapterType && !op.adapterRegistered && (
                    <span className="ml-2 text-[11px] text-[#F59E0B]">unregistered</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {op.status === 'active' ? (
                    <span className="text-[#22C55E] text-[12px]">active</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#F59E0B] text-[12px]">
                      <PauseCircle size={13} strokeWidth={1.5} />
                      {op.status}{op.pauseReason ? ` · ${op.pauseReason}` : ''}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-[#A0A0A0]">{op.activeRunCount}/{op.maxConcurrent}</td>
                <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums hidden md:table-cell">
                  {op.budgetMonthlyCents > 0 ? (
                    <span className={op.spentMonthlyCents >= op.budgetMonthlyCents ? 'text-[#EF4444]' : 'text-[#A0A0A0]'}>
                      ${(op.spentMonthlyCents / 100).toFixed(2)} / ${(op.budgetMonthlyCents / 100).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[#A0A0A0]">unmetered</span>
                  )}
                </td>
              </tr>
            ))}
            {data.operators.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-[#6B7280] text-sm">No agent operators registered</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Queue */}
      <h2 className="text-base font-semibold text-[#F5F5F5] mb-3">Wakeup queue</h2>
      <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.02em] text-[#6B7280] border-b border-[rgba(255,255,255,0.04)]">
              <th className="px-3 py-2.5 font-medium">Task</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Operator</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium hidden md:table-cell">Source</th>
              <th className="px-3 py-2.5 font-medium">Idle</th>
            </tr>
          </thead>
          <tbody>
            {data.queue.items.map(item => (
              <tr key={item.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-b-0 hover:bg-[#1A1A1A]">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {item.task && (
                      <span className="w-1 h-4 rounded-full shrink-0" style={{ background: WORKSPACE_ACCENT[item.task.workspaceId] ?? '#4B5563' }} />
                    )}
                    <span className="text-[#F5F5F5] truncate max-w-[360px]">{item.task?.title ?? '(no task)'}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-[12px] text-[#A0A0A0] hidden md:table-cell">{item.operatorId}</td>
                <td className="px-3 py-2.5">
                  <span className="text-[12px]" style={{ color: QUEUE_STATUS_COLOR[item.status] ?? '#A0A0A0' }}>{item.status}</span>
                  {item.isStale && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[#EF4444]">
                      <AlertTriangle size={12} strokeWidth={1.5} /> stale
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-[#6B7280] hidden md:table-cell">{item.source}</td>
                <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-[#A0A0A0]">{idle(item.idleMs)}</td>
              </tr>
            ))}
            {data.queue.items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-[#6B7280] text-sm">Queue is empty — nothing waiting to dispatch</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Active sessions */}
      <h2 className="text-base font-semibold text-[#F5F5F5] mb-3">Active sessions</h2>
      <div className="bg-[#141414] border border-[rgba(255,255,255,0.06)] rounded-[8px] overflow-hidden">
        {data.activeSessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-[#6B7280] text-sm">No harness is working a task right now</div>
        ) : (
          <ul>
            {data.activeSessions.map(s => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-b-0 hover:bg-[#1A1A1A]">
                <div className="flex items-center gap-2 min-w-0">
                  <Send size={14} strokeWidth={1.5} className="text-[#6B7280] shrink-0" />
                  <span className="text-sm text-[#F5F5F5] truncate">{s.task?.title ?? s.taskId}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono text-[11px] text-[#6B7280]">{s.operatorId} · {s.adapterType}</span>
                  {s.sessionDisplayId && <span className="font-mono text-[11px] text-[#4B5563]">{s.sessionDisplayId}</span>}
                  <span className="text-[11px] text-[#6B7280]">checkpoint {timeAgo(s.lastCheckpointAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
