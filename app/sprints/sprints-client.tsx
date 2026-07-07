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
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Sprints</h1>
        <button
          onClick={openDialog}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#201A14] border border-[rgba(167,155,120,0.13)] text-sm text-[#E8DFCE] hover:border-[rgba(167,155,120,0.26)] hover:bg-[#272018] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          New Sprint
        </button>
      </div>

      {sprints.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#5C5340]">No sprints yet.</p>
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
                className="p-5 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] hover:border-[rgba(167,155,120,0.22)] hover:bg-[#201A14] transition-all block"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#E8DFCE]">{sprint.name}</h3>
                    {sprint.goal && <p className="text-xs text-[#7A6F55] mt-0.5">{sprint.goal}</p>}
                  </div>
                  {sprint.status && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(167,155,120,0.13)] text-[#A79B78]">
                      {sprint.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-[#7A6F55]">{sprintTasks.length} tasks</span>
                  {sprint.startDate && <span className="text-xs text-[#7A6F55]">{formatDate(sprint.startDate)}</span>}
                  {sprint.endDate && <span className="text-xs text-[#7A6F55]">→ {formatDate(sprint.endDate)}</span>}
                  <span className="text-xs font-mono text-[#A79B78]">{progress}% done</span>
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
            className="absolute inset-0 bg-[rgba(10,8,6,0.7)] backdrop-blur-sm"
            onClick={closeDialog}
          />
          <div className="relative z-10 w-full max-w-md rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.18)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[#E8DFCE]">New Sprint</h2>
              <button
                onClick={closeDialog}
                className="text-[#7A6F55] hover:text-[#E8DFCE] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Sprint Name */}
              <div>
                <label className="block text-xs font-medium text-[#A79B78] mb-1.5">
                  Sprint Name <span className="text-[#C0452E]">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sprint 1 — Launch Prep"
                  required
                  className="w-full px-3 py-2 rounded-none bg-[#14100C] border border-[rgba(167,155,120,0.18)] text-sm text-[#E8DFCE] placeholder:text-[#5C5340] focus:outline-none focus:border-[rgba(167,155,120,0.44)] transition-colors"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-[#A79B78] mb-1.5">
                  Start Date <span className="text-[#C0452E]">*</span>
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-none bg-[#14100C] border border-[rgba(167,155,120,0.18)] text-sm text-[#E8DFCE] focus:outline-none focus:border-[rgba(167,155,120,0.44)] transition-colors [color-scheme:dark]"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-medium text-[#A79B78] mb-1.5">
                  End Date <span className="text-[#C0452E]">*</span>
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-none bg-[#14100C] border border-[rgba(167,155,120,0.18)] text-sm text-[#E8DFCE] focus:outline-none focus:border-[rgba(167,155,120,0.44)] transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Goal */}
              <div>
                <label className="block text-xs font-medium text-[#A79B78] mb-1.5">
                  Goal <span className="text-[#5C5340]">(optional)</span>
                </label>
                <textarea
                  value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  placeholder="What do you want to achieve in this sprint?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-none bg-[#14100C] border border-[rgba(167,155,120,0.18)] text-sm text-[#E8DFCE] placeholder:text-[#5C5340] focus:outline-none focus:border-[rgba(167,155,120,0.44)] transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-3 py-1.5 rounded-none text-sm text-[#7A6F55] hover:text-[#E8DFCE] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim() || !form.startDate || !form.endDate}
                  className="px-4 py-1.5 rounded-none bg-[#E8DFCE] text-[#14100C] text-sm font-medium hover:bg-[#E8DFCE] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
