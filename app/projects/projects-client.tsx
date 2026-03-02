'use client'
import { useState } from 'react'
import { Plus, ExternalLink, Edit2, Trash2, X, Download } from 'lucide-react'
import Link from 'next/link'
import { type WorkspaceId, type Project, type Task, type Area, type Contact, PROJECT_STATUSES } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(() => import('@/components/block-editor').then(m => m.BlockEditor), { ssr: false })

interface ProjectsClientProps {
  initialProjects: Project[]
  allTasks: Task[]
  allAreas: Area[]
  allContacts: Contact[]
  workspaceId: WorkspaceId
}

const KORUS_REGIONS = [
  { value: 'Singapore', label: '🇸🇬 Singapore' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Global', label: '🌏 Global' },
]

interface ProjectDialogProps {
  project?: Project | null
  workspaceId: WorkspaceId
  areas: Area[]
  contacts: Contact[]
  onClose: () => void
  onSave: (data: Partial<Project>) => Promise<void>
  onDelete?: () => Promise<void>
}

function ProjectDialog({ project, workspaceId, areas, contacts, onClose, onSave, onDelete }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState<unknown>(project?.description ?? undefined)
  const [status, setStatus] = useState(project?.status ?? 'Planning')
  const [areaId, setAreaId] = useState(project?.areaId ?? '')
  const [endDate, setEndDate] = useState(project?.endDate ?? '')
  const [budget, setBudget] = useState(project?.budget ?? '')
  const [region, setRegion] = useState(project?.region ?? '')
  const [projectManagerId, setProjectManagerId] = useState(project?.projectManagerId ?? '')
  const [clientId, setClientId] = useState(project?.clientId ?? '')
  const [leadGenId, setLeadGenId] = useState(project?.leadGenId ?? '')
  const [slackChannelId, setSlackChannelId] = useState(project?.slackChannelId ?? '')
  const [slackChannelName, setSlackChannelName] = useState(project?.slackChannelName ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isKorus = workspaceId === 'korus'

  const selectCls = 'w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none focus:border-[rgba(255,255,255,0.16)]'
  const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const descString = description
        ? (typeof description === 'string' ? description : JSON.stringify(description))
        : undefined
      await onSave({
        name: name.trim(),
        description: descString,
        status,
        areaId: areaId || undefined,
        endDate: endDate || undefined,
        budget: budget !== '' ? String(budget) : undefined,
        region: isKorus && region ? region : undefined,
        projectManagerId: projectManagerId || undefined,
        clientId: clientId || undefined,
        leadGenId: leadGenId || undefined,
        slackChannelId: slackChannelId || undefined,
        slackChannelName: slackChannelName || undefined,
      })
      onClose()
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(); onClose() } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Row 1: Name */}
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" autoFocus
            className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />

          {/* Row 2: Status + Region (KORUS) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {isKorus ? (
              <div>
                <label className={labelCls}>Region</label>
                <select value={region} onChange={e => setRegion(e.target.value)} className={selectCls}>
                  <option value="">— None —</option>
                  {KORUS_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none [color-scheme:dark]" />
              </div>
            )}
          </div>

          {/* Row 3: Area + Budget */}
          <div className="grid grid-cols-2 gap-3">
            {areas.length > 0 && (
              <div>
                <label className={labelCls}>Area</label>
                <select value={areaId} onChange={e => setAreaId(e.target.value)} className={selectCls}>
                  <option value="">— None —</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Budget (+ revenue / − cost)</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. -3200 or 12500"
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            </div>
          </div>

          {/* Row 4: Project Manager + Client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project Manager</label>
              <select value={projectManagerId} onChange={e => setProjectManagerId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.role ? ` · ${c.role}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.role ? ` · ${c.role}` : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Row 5: Lead Gen (optional) */}
          <div>
            <label className={labelCls}>Lead Gen Contact (optional)</label>
            <select value={leadGenId} onChange={e => setLeadGenId(e.target.value)} className={selectCls}>
              <option value="">— None —</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.role ? ` · ${c.role}` : ''}</option>)}
            </select>
          </div>

          {/* KORUS: End Date below region */}
          {isKorus && (
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none [color-scheme:dark]" />
            </div>
          )}

          {/* Slack Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Slack Channel Name (optional)</label>
              <input value={slackChannelName} onChange={e => setSlackChannelName(e.target.value)} placeholder="#channel-name"
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            </div>
            <div>
              <label className={labelCls}>Slack Channel ID (optional)</label>
              <input value={slackChannelId} onChange={e => setSlackChannelId(e.target.value)} placeholder="C0XXXXXXXX"
                className="w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <div className="rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] overflow-hidden max-h-40 overflow-y-auto">
              <BlockEditor
                initialContent={project?.description}
                onChange={(blocks) => setDescription(blocks)}
                className="text-sm [&_.bn-editor]:min-h-[72px] [&_.bn-editor]:px-3 [&_.bn-editor]:py-2"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <div>
            {project && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#EF4444]">Delete project?</span>
                  <button onClick={handleDelete} disabled={deleting} className="text-xs text-[#EF4444] hover:underline font-medium">
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#6B7280] hover:text-[#F5F5F5]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-4 py-2.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors">
              {saving ? 'Saving...' : project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  Planning: 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]',
  Active: 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  'On Hold': 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]',
  Completed: 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]',
  Archived: 'text-[#4B5563] bg-[rgba(75,85,99,0.12)]',
}

export function ProjectsClient({ initialProjects, allTasks, allAreas, allContacts, workspaceId }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [showDialog, setShowDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const { workspace } = useWorkspace()
  const router = useRouter()

  const getProgress = (projectId: string) => {
    const projectTasks = allTasks.filter(t => t.projectId === projectId)
    if (projectTasks.length === 0) return 0
    const done = projectTasks.filter(t => ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)).length
    return Math.round((done / projectTasks.length) * 100)
  }

  const getTaskCount = (projectId: string) => allTasks.filter(t => t.projectId === projectId).length

  function exportMarkdown() {
    const date = new Date().toISOString().slice(0, 10)
    const lines: string[] = [`# Projects — ${workspaceId}\n`]
    for (const p of projects) {
      const tasks = allTasks.filter(t => t.projectId === p.id)
      lines.push(`## ${p.name}`)
      lines.push(`- **Status:** ${p.status ?? 'Planning'}`)
      if (p.endDate) lines.push(`- **End Date:** ${p.endDate}`)
      if (p.budget) lines.push(`- **Budget:** ${p.budget}`)
      if (tasks.length) {
        lines.push('\n### Tasks')
        for (const t of tasks) {
          lines.push(`- [${t.status}] ${t.title}${t.assignee ? ` _(${t.assignee})_` : ''}`)
        }
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `projects-${workspaceId}-${date}.md`
    a.click()
  }

  async function handleCreate(data: Partial<Project>) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    if (res.ok) {
      const project = await res.json() as Project
      setProjects(prev => [project, ...prev])
      router.refresh()
      toast.success('Project created')
    } else {
      toast.error('Failed to create project')
    }
  }

  async function handleUpdate(id: string, data: Partial<Project>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json() as Project
      setProjects(prev => prev.map(p => p.id === id ? updated : p))
      toast.success('Project updated')
    } else {
      toast.error('Failed to update project')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== id))
      toast.success('Project deleted')
    } else {
      toast.error('Failed to delete project')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Projects</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => { setEditingProject(null); setShowDialog(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors"
          >
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const progress = getProgress(project.id)
            const taskCount = getTaskCount(project.id)
            const budgetNum = project.budget ? Number(project.budget) : null
            return (
              <div key={project.id} className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/projects/${project.id}?workspace=${workspaceId}`} className="text-sm font-semibold text-[#F5F5F5] flex-1 mr-2 hover:opacity-80 transition-opacity">
                    {project.name}
                  </Link>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingProject(project); setShowDialog(true) }}
                      className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <Link href={`/projects/${project.id}?workspace=${workspaceId}`}>
                      <ExternalLink className="w-3.5 h-3.5 text-[#4B5563] hover:text-[#6B7280] transition-colors" />
                    </Link>
                  </div>
                </div>
                {project.description && (
                  <p className="text-xs text-[#6B7280] mb-4 line-clamp-2">
                    {project.description.trimStart().startsWith('[')
                      ? (() => {
                          try {
                            const blocks = JSON.parse(project.description!) as Array<{ content?: Array<{ text?: string }> }>
                            return blocks.map(b => b.content?.map(c => c.text ?? '').join('') ?? '').filter(Boolean).join(' ')
                          } catch { return project.description }
                        })()
                      : project.description}
                  </p>
                )}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#6B7280]">{taskCount} tasks</span>
                    <span className="text-xs font-mono text-[#A0A0A0]">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: workspace.color }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.status && (
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[project.status] ?? 'text-[#A0A0A0] bg-[rgba(255,255,255,0.06)]')}>
                      {project.status}
                    </span>
                  )}
                  {budgetNum !== null && (
                    <span className={cn('text-xs', budgetNum < 0 ? 'text-[#EF4444]' : 'text-[#22C55E]')}>
                      {budgetNum < 0 ? `-$${Math.abs(budgetNum).toLocaleString()}` : `$${budgetNum.toLocaleString()}`}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDialog && (
        <ProjectDialog
          project={editingProject}
          workspaceId={workspaceId}
          areas={allAreas}
          contacts={allContacts}
          onClose={() => { setShowDialog(false); setEditingProject(null) }}
          onSave={editingProject ? (d) => handleUpdate(editingProject.id, d) : handleCreate}
          onDelete={editingProject ? () => handleDelete(editingProject.id) : undefined}
        />
      )}
    </div>
  )
}
