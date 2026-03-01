'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import type { Sprint, Task } from '@/types'

interface SprintsClientProps {
  initialSprints: Sprint[]
  workspaceId: string
  allTasks: Task[]
}

interface NewSprintForm {
  name: string
  startDate: string
  endDate: string
  goal: string
}

const DONE_STATUSES = ['Delivered', 'Won', 'Completed', 'Paid', 'Done']

export function SprintsClient({ initialSprints, workspaceId, allTasks }: SprintsClientProps) {
  const router = useRouter()
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NewSprintForm>({
    name: '',
    startDate: '',
    endDate: '',
    goal: '',
  })

  function openDialog() {
    setForm({ name: '', startDate: '', endDate: '', goal: '' })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.startDate || !form.endDate) return

    setSaving(true)
    try {
      const res = await fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          goal: form.goal.trim() || undefined,
          workspaceId,
          status: 'planning',
        }),
      })

      if (!res.ok) throw new Error('Failed to create sprint')

      const sprint = await res.json() as Sprint
      setSprints(prev => [sprint, ...prev])
      toast.success('Sprint created')
      closeDialog()
      router.refresh()
    } catch {
      toast.error('Failed to create sprint')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Sprints</h1>
        <button
          onClick={openDialog}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-sm text-[#F5F5F5] hover:border-[rgba(255,255,255,0.12)] hover:bg-[#222] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Sprint
        </button>
      </div>

      {sprints.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No sprints yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.map(sprint => {
            const sprintTasks = allTasks.filter(t => t.sprintId === sprint.id)
            const completed = sprintTasks.filter(t => DONE_STATUSES.includes(t.status)).length
            const progress = sprintTasks.length > 0 ? Math.round((completed / sprintTasks.length) * 100) : 0

            return (
              <Link
                key={sprint.id}
                href={`/sprints/${sprint.id}`}
                className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all block"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">{sprint.name}</h3>
                    {sprint.goal && <p className="text-xs text-[#6B7280] mt-0.5">{sprint.goal}</p>}
                  </div>
                  {sprint.status && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">
                      {sprint.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-[#6B7280]">{sprintTasks.length} tasks</span>
                  {sprint.startDate && <span className="text-xs text-[#6B7280]">{formatDate(sprint.startDate)}</span>}
                  {sprint.endDate && <span className="text-xs text-[#6B7280]">→ {formatDate(sprint.endDate)}</span>}
                  <span className="text-xs font-mono text-[#A0A0A0]">{progress}% done</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Creation Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDialog}
          />
          <div className="relative z-10 w-full max-w-md rounded-[10px] bg-[#141414] border border-[rgba(255,255,255,0.08)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#F5F5F5]">New Sprint</h2>
              <button
                onClick={closeDialog}
                className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Sprint Name */}
              <div>
                <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">
                  Sprint Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sprint 1 — Launch Prep"
                  required
                  className="w-full px-3 py-2 rounded-[6px] bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] text-sm text-[#F5F5F5] placeholder:text-[#4B5563] focus:outline-none focus:border-[rgba(255,255,255,0.20)] transition-colors"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">
                  Start Date <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-[6px] bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] text-sm text-[#F5F5F5] focus:outline-none focus:border-[rgba(255,255,255,0.20)] transition-colors [color-scheme:dark]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">
                  End Date <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-[6px] bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] text-sm text-[#F5F5F5] focus:outline-none focus:border-[rgba(255,255,255,0.20)] transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">
                  Goal <span className="text-[#4B5563]">(optional)</span>
                </label>
                <textarea
                  value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  placeholder="What do you want to achieve in this sprint?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-[6px] bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] text-sm text-[#F5F5F5] placeholder:text-[#4B5563] focus:outline-none focus:border-[rgba(255,255,255,0.20)] transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-3 py-1.5 rounded-[6px] text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim() || !form.startDate || !form.endDate}
                  className="px-4 py-1.5 rounded-[6px] bg-[#F5F5F5] text-[#0F0F0F] text-sm font-medium hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating…' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
