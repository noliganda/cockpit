'use client'
import { useState, useMemo } from 'react'
import { Plus, ExternalLink, Edit2, Trash2, X, Download, Link2, TrendingUp, TrendingDown, Folders, CheckCircle2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
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

// ── Chart + accent colors ─────────────────────────────────────────────────
const TEAL   = '#2A9D8F'
const ORANGE = '#F4A261'
const GOLD   = '#D4A017'
const MUTED  = '#6B7280'

const STATUS_CHART_COLORS: Record<string, string> = {
  Planning: '#457B9D',
  Active: TEAL,
  'On Hold': ORANGE,
  Completed: MUTED,
  Archived: '#374151',
}

export function ProjectsClient({ initialProjects, allTasks, allAreas, allContacts, workspaceId }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [showDialog, setShowDialog] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const { workspace } = useWorkspace()
  const router = useRouter()

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getProgress = (projectId: string) => {
    const pt = allTasks.filter(t => t.projectId === projectId)
    if (pt.length === 0) return 0
    const done = pt.filter(t => ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)).length
    return Math.round((done / pt.length) * 100)
  }
  const getTaskCount = (projectId: string) => allTasks.filter(t => t.projectId === projectId).length
  const getArea = (areaId?: string | null) => allAreas.find(a => a.id === areaId)

  // ── Analytics ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalRevenue = 0, totalCost = 0, completedCount = 0, activeCount = 0
    for (const p of projects) {
      const b = p.budget ? Number(p.budget) : 0
      if (b > 0) totalRevenue += b
      if (b < 0) totalCost += Math.abs(b)
      if (p.status === 'Active') activeCount++
      if (p.status === 'Completed') completedCount++
    }
    const avgProgress = projects.length
      ? Math.round(projects.reduce((sum, p) => sum + getProgress(p.id), 0) / projects.length)
      : 0
    return { totalRevenue, totalCost, activeCount, completedCount, avgProgress }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, allTasks])

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of projects) {
      const s = p.status ?? 'Planning'
      counts[s] = (counts[s] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [projects])

  const contextChartData = useMemo(() => {
    let internal = 0, external = 0, unset = 0
    for (const p of projects) {
      const area = getArea(p.areaId)
      if (!area?.context) unset++
      else if (area.context === 'Internal') internal++
      else external++
    }
    const data = []
    if (internal) data.push({ name: 'Internal', value: internal })
    if (external) data.push({ name: 'External', value: external })
    if (unset)    data.push({ name: 'Unassigned', value: unset })
    return data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, allAreas])

  const pipelineData = useMemo(() =>
    [...projects]
      .filter(p => p.budget && Number(p.budget) !== 0)
      .sort((a, b) => Math.abs(Number(b.budget)) - Math.abs(Number(a.budget)))
      .slice(0, 8)
      .map(p => ({
        name: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
        value: Math.abs(Number(p.budget)),
        isRevenue: Number(p.budget) > 0,
      })),
  [projects])

  // ── CRUD ─────────────────────────────────────────────────────────────────
  function exportMarkdown() {
    const date = new Date().toISOString().slice(0, 10)
    const lines: string[] = [`# Projects — ${workspaceId}\n`]
    for (const p of projects) {
      const tasks = allTasks.filter(t => t.projectId === p.id)
      lines.push(`## ${p.name}`)
      lines.push(`- **Status:** ${p.status ?? 'Planning'}`)
      if (p.endDate) lines.push(`- **End Date:** ${p.endDate}`)
      if (p.budget)  lines.push(`- **Budget:** ${p.budget}`)
      if (tasks.length) {
        lines.push('\n### Tasks')
        for (const t of tasks)
          lines.push(`- [${t.status}] ${t.title}${t.assignee ? ` _(${t.assignee})_` : ''}`)
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, workspaceId }),
    })
    if (res.ok) {
      const project = await res.json() as Project
      setProjects(prev => [project, ...prev])
      router.refresh()
      toast.success('Project created')
    } else toast.error('Failed to create project')
  }

  async function handleUpdate(id: string, data: Partial<Project>) {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) { toast.error('Failed to update project'); return }
    toast.success('Project updated')
    // re-fetch to get fresh data
    const fresh = await fetch(`/api/projects/${id}`).then(r => r.json()) as Project
    setProjects(prev => prev.map(p => p.id === id ? fresh : p))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    if (res.ok) { setProjects(prev => prev.filter(p => p.id !== id)); toast.success('Project deleted') }
    else toast.error('Failed to delete project')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Projects</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => { setEditingProject(null); setShowDialog(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors">
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pipeline Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, sub: 'total budgeted income', icon: TrendingUp, color: TEAL },
          { label: 'Total Costs', value: `$${stats.totalCost.toLocaleString()}`, sub: 'total budgeted expenses', icon: TrendingDown, color: ORANGE },
          { label: 'Active Projects', value: String(stats.activeCount), sub: `${projects.length} total`, icon: Folders, color: GOLD },
          { label: 'Avg Completion', value: `${stats.avgProgress}%`, sub: `${stats.completedCount} completed`, icon: CheckCircle2, color: '#A0A0A0' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[#6B7280] uppercase tracking-wide">{label}</span>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</span>
            <span className="text-xs text-[#4B5563]">{sub}</span>
          </div>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[rgba(255,255,255,0.06)] rounded-[8px]">
          <p className="text-sm text-[#4B5563]">No projects yet.</p>
          <button onClick={() => { setEditingProject(null); setShowDialog(true) }}
            className="mt-3 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
            Create your first project →
          </button>
        </div>
      ) : (
        <>
          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Status donut */}
            <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">By Status</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={2} dataKey="value">
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_CHART_COLORS[entry.name] ?? MUTED} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 flex-1">
                  {statusChartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_CHART_COLORS[d.name] ?? MUTED }} />
                        <span className="text-[#A0A0A0]">{d.name}</span>
                      </div>
                      <span className="text-[#F5F5F5] font-medium tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Internal vs External donut */}
            <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">Internal vs External</h3>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={contextChartData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={2} dataKey="value">
                      {contextChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.name === 'Internal' ? GOLD : entry.name === 'External' ? TEAL : MUTED} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 flex-1">
                  {contextChartData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.name === 'Internal' ? GOLD : d.name === 'External' ? TEAL : MUTED }} />
                        <span className="text-[#A0A0A0]">{d.name}</span>
                      </div>
                      <span className="text-[#F5F5F5] font-medium tabular-nums">{d.value}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-[#4B5563] mt-1">Based on area context</p>
                </div>
              </div>
            </div>

            {/* Xero placeholder */}
            <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] border-dashed flex flex-col items-center justify-center text-center gap-2">
              <Link2 className="w-6 h-6 text-[#4B5563]" />
              <p className="text-xs font-semibold text-[#6B7280]">Xero not connected</p>
              <p className="text-[10px] text-[#4B5563] max-w-[180px]">Connect Xero to pull actual invoice & expense data per project</p>
              <span className="mt-1 text-[10px] px-2 py-1 rounded-full border border-[rgba(255,255,255,0.06)] text-[#4B5563]">Coming in Step 3</span>
            </div>
          </div>

          {/* ── Pipeline bar chart ── */}
          {pipelineData.length > 0 && (
            <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">Project Pipeline (Top {pipelineData.length} by value)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#A0A0A0', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11 }}
                    formatter={(v: number, _n: string, props: { payload?: { isRevenue?: boolean } }) => [`$${v.toLocaleString()}`, props.payload?.isRevenue ? 'Revenue' : 'Cost']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.isRevenue ? TEAL : ORANGE} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 justify-end">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: TEAL }} />Revenue</div>
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ORANGE }} />Cost</div>
              </div>
            </div>
          )}

          {/* ── Project cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => {
              const progress = getProgress(project.id)
              const taskCount = getTaskCount(project.id)
              const area = getArea(project.areaId)
              const budgetNum = project.budget ? Number(project.budget) : null
              const isRevenue = budgetNum !== null && budgetNum > 0
              const accentColor = area?.context === 'Internal' ? GOLD : area?.context === 'External' ? TEAL : MUTED
              return (
                <div key={project.id}
                  className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all group"
                  style={{ borderLeftColor: accentColor, borderLeftWidth: 2 }}>
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/projects/${project.id}?workspace=${workspaceId}`}
                      className="text-sm font-semibold text-[#F5F5F5] flex-1 mr-2 hover:opacity-80 transition-opacity leading-snug">
                      {project.name}
                    </Link>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingProject(project); setShowDialog(true) }}
                        className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/projects/${project.id}?workspace=${workspaceId}`}>
                        <ExternalLink className="w-3.5 h-3.5 text-[#4B5563] hover:text-[#6B7280] transition-colors" />
                      </Link>
                    </div>
                  </div>

                  {/* Area tag */}
                  {area && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: accentColor, background: `${accentColor}18` }}>
                        {area.icon} {area.name}
                      </span>
                      {area.context && (
                        <span className="text-[10px] text-[#4B5563]">{area.context}</span>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#6B7280]">{taskCount} tasks</span>
                      <span className="text-xs font-mono text-[#A0A0A0]">{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: accentColor }} />
                    </div>
                  </div>

                  {/* Footer: status + budget */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {project.status && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[project.status] ?? 'text-[#A0A0A0] bg-[rgba(255,255,255,0.06)]')}>
                        {project.status}
                      </span>
                    )}
                    {budgetNum !== null && (
                      <span className="text-xs font-medium" style={{ color: isRevenue ? TEAL : ORANGE }}>
                        {isRevenue ? `+$${budgetNum.toLocaleString()}` : `-$${Math.abs(budgetNum).toLocaleString()}`}
                      </span>
                    )}
                    {project.endDate && (
                      <span className="text-xs text-[#4B5563] ml-auto">{project.endDate}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
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
