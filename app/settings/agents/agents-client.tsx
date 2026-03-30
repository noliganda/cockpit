'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { type Operator, type OperatorStatus } from '@/types'

interface OperatorRow extends Operator {
  budgetMonthlyCents: number
  spentMonthlyCents: number
  lastHeartbeatAt: string | null
  status: OperatorStatus
}

export function AgentsClient() {
  const [operators, setOperators] = useState<OperatorRow[]>([])
  const [tasksCount, setTasksCount] = useState(0)

  useEffect(() => {
    fetch('/api/operators')
      .then(res => res.json())
      .then(data => setOperators(data))
      .catch(() => {})
    fetch('/api/tasks?status=Backlog')
      .then(res => res.json())
      .then(data => setTasksCount(data.length))
      .catch(() => {})
  }, [])

  const activeCount = operators.filter(o => o.status === 'active').length
  const totalBudget = operators.reduce((sum, o) => sum + (o.budgetMonthlyCents || 0), 0)
  const totalSpent = operators.reduce((sum, o) => sum + (o.spentMonthlyCents || 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5]">Agents & Operators</h1>
      <p className="text-sm text-[#A0A0A0] mb-4">Manage your AI agent team</p>
      <div className="flex flex-wrap gap-4 mb-6 text-sm text-[#F5F5F5]">
        <div>🟢 Active agents: {activeCount}</div>
        <div>💰 Budget: ${(totalBudget / 100).toFixed(2)}</div>
        <div>💸 Spent: ${(totalSpent / 100).toFixed(2)}</div>
        <div>📋 Tasks in queue: {tasksCount}</div>
      </div>
      <table className="w-full text-sm text-left text-[#F5F5F5] border-collapse">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Budget</th>
            <th className="px-3 py-2">Heartbeat</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {operators.map(o => {
            const pct = o.budgetMonthlyCents ? o.spentMonthlyCents / o.budgetMonthlyCents : 0
            const color = pct > 0.9 ? 'bg-red-500' : pct > 0.7 ? 'bg-yellow-500' : 'bg-green-500'
            const elapsed = o.lastHeartbeatAt
              ? Math.floor((Date.now() - new Date(o.lastHeartbeatAt).getTime()) / 60000)
              : null
            return (
              <tr key={o.id} className="border-b border-[rgba(255,255,255,0.04)]">
                <td className="px-3 py-2">{o.name}</td>
                <td className="px-3 py-2">{o.role}</td>
                <td className="px-3 py-2">{o.operatorType === 'agent' ? '🤖 Agent' : '🧑 Human'}</td>
                <td className="px-3 py-2">{o.status === 'active' ? '🟢 Active' : '🔴 Paused'}</td>
                <td className="px-3 py-2">
                  <div className="w-full bg-[#0A0A0A] rounded overflow-hidden h-2 mb-1">
                    <div className={`${color} h-2`} style={{ width: `${pct * 100}%` }} />
                  </div>
                  <div className="text-xs">{(o.spentMonthlyCents/100).toFixed(2)} / {(o.budgetMonthlyCents/100).toFixed(2)}</div>
                </td>
                <td className="px-3 py-2">{elapsed !== null ? `${elapsed} min ago` : 'Never'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={async () => {
                      const next = o.status === 'active' ? 'paused' : 'active'
                      const body: { status: string; pauseReason?: string } = { status: next }
                      if (next === 'paused') body.pauseReason = 'Manual pause'
                      const res = await fetch(`/api/operators/${o.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                      })
                      if (res.ok) {
                        setOperators(prev => prev.map(x => x.id === o.id ? { ...x, status: next } : x))
                        toast.success('Updated operator')
                      } else {
                        toast.error('Failed to update')
                      }
                    }}
                    className="px-2 py-1 bg-[#1A1A1A] rounded hover:bg-[#222222]"
                  >
                    {o.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
