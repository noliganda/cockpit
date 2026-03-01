'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckSquare, FileText, Database, Users, FolderOpen, Zap, Star, Plus, X, Download } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { type Project, type Task, type Area, type Note, type Milestone, type Bookmark, type ProjectContact, type Contact } from '@/types'
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(() => import('@/components/block-editor').then(m => m.BlockEditor), { ssr: false })

interface ProjectDetailClientProps {
  project: Project
  projectTasks: Task[]
  projectNotes: Note[]
  area: Area | null
  progress: number
  initialMilestones: Milestone[]
  initialBookmarks: Bookmark[]
  initialProjectContacts: ProjectContact[]
  workspaceContacts: Contact[]
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: FolderOpen },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'bases', label: 'Bases', icon: Database },
  { id: 'contacts', label: 'Team', icon: Users },
] as const

type TabId = typeof TABS[number]['id']

const STATUS_COLORS: Record<string, string> = {
  Planning: 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]',
  Active: 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  'On Hold': 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]',
  Completed: 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]',
  Archived: 'text-[#4B5563] bg-[rgba(75,85,99,0.12)]',
}

const inputCls = 'px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]'
const labelCls = 'text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'
const btnSecondary = 'px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[#222222] transition-colors'

// ── Milestones Section ──────────────────────────────────────────────────────

function MilestonesSection({ projectId, initial }: { projectId: string; initial: Milestone[] }) {
  const [milestones, setMilestones] = useState<Milestone[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [adding, setAdding] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  async function handleAdd() {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), date: newDate || undefined }),
      })
      if (res.ok) {
        const m = await res.json() as Milestone
        setMilestones(prev => {
          const next = [...prev, m].sort((a, b) => {
            if (!a.date) return 1
            if (!b.date) return -1
            return a.date.localeCompare(b.date)
          })
          return next
        })
        setNewTitle('')
        setNewDate('')
        setShowForm(false)
      }
    } finally { setAdding(false) }
  }

  async function handleToggle(m: Milestone) {
    const newStatus = m.status === 'completed' ? 'pending' : 'completed'
    const res = await fetch(`/api/projects/${projectId}/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMilestones(prev => prev.filter(x => x.id !== id))
    }
  }

  return (
    <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className={labelCls}>Milestones</h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className={btnSecondary + ' flex items-center gap-1'}
        >
          <Plus className="w-3 h-3" /> Add Milestone
        </button>
      </div>

      {showForm && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)]">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Milestone title"
            className={inputCls + ' flex-1'}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className={inputCls + ' w-36 [color-scheme:dark]'}
          />
          <button onClick={handleAdd} disabled={adding || !newTitle.trim()} className={btnSecondary + ' shrink-0 disabled:opacity-40'}>
            {adding ? '...' : 'Add'}
          </button>
          <button onClick={() => setShowForm(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="text-xs text-[#4B5563] py-4 text-center">No milestones yet.</p>
      ) : (
        <div className="space-y-0">
          {milestones.map((m, i) => {
            const isCompleted = m.status === 'completed'
            const isDateOverdue = m.date && m.date < today && !isCompleted
            return (
              <div key={m.id} className="flex items-start gap-3 py-2.5 group relative">
                {/* timeline line */}
                {i < milestones.length - 1 && (
                  <div className="absolute left-[9px] top-[28px] bottom-0 w-px bg-[rgba(255,255,255,0.06)]" />
                )}
                <button
                  onClick={() => handleToggle(m)}
                  className={cn(
                    'w-[18px] h-[18px] shrink-0 rounded-full border-2 mt-0.5 transition-colors',
                    isCompleted
                      ? 'border-[#22C55E] bg-[#22C55E]'
                      : 'border-[rgba(255,255,255,0.20)] bg-transparent hover:border-[rgba(255,255,255,0.40)]'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', isCompleted ? 'line-through text-[#6B7280]' : 'text-[#F5F5F5]')}>
                    {m.title}
                  </p>
                  {m.date && (
                    <p className={cn('text-xs mt-0.5', isDateOverdue ? 'text-[#EF4444]' : 'text-[#6B7280]')}>
                      {formatDate(m.date)}{isDateOverdue && ' · Overdue'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4B5563] hover:text-[#EF4444] shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Bookmarks / Links Section ───────────────────────────────────────────────

const PRESET_LINKS = ['Google Drive', 'Slack Channel', 'Frame.io', 'Xero Project']

function BookmarksSection({ projectId, initial }: { projectId: string; initial: Bookmark[] }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!newTitle.trim() || !newUrl.trim()) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), url: newUrl.trim() }),
      })
      if (res.ok) {
        const b = await res.json() as Bookmark
        setBookmarks(prev => [...prev, b])
        setNewTitle('')
        setNewUrl('')
        setShowForm(false)
      }
    } finally { setAdding(false) }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/projects/${projectId}/bookmarks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBookmarks(prev => prev.filter(b => b.id !== id))
    }
  }

  function openPreset(title: string) {
    setNewTitle(title)
    setNewUrl('')
    setShowForm(true)
  }

  return (
    <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className={labelCls}>Links</h3>
        <button
          onClick={() => { setNewTitle(''); setNewUrl(''); setShowForm(v => !v) }}
          className={btnSecondary + ' flex items-center gap-1'}
        >
          <Plus className="w-3 h-3" /> Add Link
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_LINKS.map(label => (
          <button
            key={label}
            onClick={() => openPreset(label)}
            className="px-2 py-1 text-xs rounded-[4px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.12)] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)]">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Title"
            className={inputCls + ' flex-1'}
          />
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls + ' flex-1'}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={adding || !newTitle.trim() || !newUrl.trim()} className={btnSecondary + ' shrink-0 disabled:opacity-40'}>
            {adding ? '...' : 'Add'}
          </button>
          <button onClick={() => setShowForm(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bookmarks.length === 0 ? (
        <p className="text-xs text-[#4B5563] py-2 text-center">No links yet.</p>
      ) : (
        <div className="space-y-1">
          {bookmarks.map(b => (
            <div key={b.id} className="flex items-center gap-2 py-1.5 group">
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0"
              >
                <span className="text-sm text-[#F5F5F5] hover:text-[#A0A0A0] transition-colors">{b.title}</span>
                <span className="block text-xs text-[#4B5563] truncate">{b.url}</span>
              </a>
              <button
                onClick={() => handleDelete(b.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4B5563] hover:text-[#EF4444] shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Team / Contacts Tab ──────────────────────────────────────────────────────

const PROJECT_CONTACT_ROLES = ['Team', 'Client', 'Contractor', 'Supplier', 'Consultant']

function TeamTab({
  projectId,
  initialProjectContacts,
  workspaceContacts,
}: {
  projectId: string
  initialProjectContacts: ProjectContact[]
  workspaceContacts: Contact[]
}) {
  const [projectContacts, setProjectContacts] = useState<ProjectContact[]>(initialProjectContacts)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [selectedRole, setSelectedRole] = useState('Team')
  const [adding, setAdding] = useState(false)

  function openAddDialog() {
    setShowAddDialog(true)
    setSearchQuery('')
    setSelectedContactId('')
    setSelectedRole('Team')
  }

  async function handleAdd() {
    if (!selectedContactId) return
    setAdding(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: selectedContactId, role: selectedRole }),
      })
      if (res.ok) {
        // Reload contacts
        const updated = await fetch(`/api/projects/${projectId}/contacts`).then(r => r.json()) as ProjectContact[]
        setProjectContacts(updated)
        setShowAddDialog(false)
      }
    } finally { setAdding(false) }
  }

  async function handleRemove(pcid: string) {
    const res = await fetch(`/api/projects/${projectId}/contacts/${pcid}`, { method: 'DELETE' })
    if (res.ok) {
      setProjectContacts(prev => prev.filter(pc => pc.id !== pcid))
    }
  }

  function downloadVcf(pc: ProjectContact) {
    const c = pc.contact
    if (!c) return
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.name}`,
      c.phone || c.mobile ? `TEL:${c.phone ?? c.mobile}` : '',
      c.email ? `EMAIL:${c.email}` : '',
      c.company ? `ORG:${c.company}` : '',
      pc.role ? `TITLE:${pc.role}` : '',
      'END:VCARD',
    ].filter(Boolean).join('\n')

    const blob = new Blob([vcf], { type: 'text/vcard' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${c.name.replace(/\s+/g, '_')}.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredContacts = workspaceContacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6B7280]">{projectContacts.length} team member{projectContacts.length !== 1 ? 's' : ''}</p>
        <button onClick={openAddDialog} className={btnSecondary + ' flex items-center gap-1'}>
          <Plus className="w-3 h-3" /> Add Contact
        </button>
      </div>

      {projectContacts.length === 0 ? (
        <p className="text-sm text-[#4B5563] text-center py-12">No team members linked to this project.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projectContacts.map(pc => {
            const c = pc.contact
            if (!c) return null
            return (
              <div key={pc.id} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] group">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-[#F5F5F5]">{c.name}</p>
                    {pc.role && <p className="text-xs text-[#6B7280]">{pc.role}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => downloadVcf(pc)}
                      title="Download VCF"
                      className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(pc.id)}
                      className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {c.company && <p className="text-xs text-[#6B7280] mb-1">{c.company}</p>}
                {c.email && (
                  <a href={`mailto:${c.email}`} className="block text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors mb-0.5 truncate">
                    {c.email}
                  </a>
                )}
                {(c.phone ?? c.mobile) && (
                  <a href={`tel:${c.phone ?? c.mobile}`} className="block text-xs text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">
                    {c.phone ?? c.mobile}
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Contact Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddDialog(false)} />
          <div className="relative w-full max-w-sm bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Add Team Member</h3>
              <button onClick={() => setShowAddDialog(false)} className="text-[#6B7280] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className={inputCls + ' w-full'}
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] p-1">
                {filteredContacts.length === 0 ? (
                  <p className="text-xs text-[#4B5563] text-center py-4">No contacts found</p>
                ) : (
                  filteredContacts.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContactId(c.id)}
                      className={cn(
                        'w-full text-left px-2.5 py-2 rounded-[4px] transition-colors',
                        selectedContactId === c.id
                          ? 'bg-[rgba(255,255,255,0.10)] text-[#F5F5F5]'
                          : 'text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F5F5F5]'
                      )}
                    >
                      <p className="text-sm">{c.name}</p>
                      {c.company && <p className="text-xs text-[#6B7280]">{c.company}</p>}
                    </button>
                  ))
                )}
              </div>
              <div>
                <label className={labelCls + ' block'}>Role on project</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className={inputCls + ' w-full appearance-none'}
                >
                  {PROJECT_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button
                onClick={handleAdd}
                disabled={adding || !selectedContactId}
                className="w-full py-2 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
              >
                {adding ? 'Adding...' : 'Add to project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ProjectDetailClient({
  project,
  projectTasks,
  projectNotes,
  area,
  progress,
  initialMilestones,
  initialBookmarks,
  initialProjectContacts,
  workspaceContacts,
}: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back link */}
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight flex-1">{project.name}</h1>
          {project.status && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-1', STATUS_COLORS[project.status] ?? 'text-[#A0A0A0] bg-[rgba(255,255,255,0.06)]')}>
              {project.status}
            </span>
          )}
        </div>
        {area && (
          <Link href={`/areas`} className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#A0A0A0] transition-colors mb-2">
            <span>{area.icon}</span>
            <span>{area.name}</span>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Tasks', value: String(projectTasks.length) },
          { label: 'Progress', value: `${progress}%` },
          { label: 'Budget', value: project.budget ? `$${Number(project.budget).toLocaleString()}` : '—' },
          { label: 'Notes', value: String(projectNotes.length) },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-lg font-bold text-[#F5F5F5] font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {projectTasks.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#6B7280]">Overall progress</span>
            <span className="text-xs font-mono text-[#A0A0A0]">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="h-full rounded-full bg-[#22C55E] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(255,255,255,0.06)] mb-6 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-[#F5F5F5] text-[#F5F5F5]'
                  : 'border-transparent text-[#6B7280] hover:text-[#A0A0A0]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === 'tasks' && projectTasks.length > 0 && (
                <span className="text-xs font-mono text-[#6B7280] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded-full">{projectTasks.length}</span>
              )}
              {tab.id === 'notes' && projectNotes.length > 0 && (
                <span className="text-xs font-mono text-[#6B7280] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded-full">{projectNotes.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {project.description && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Description</h3>
              <div className="text-sm [&_.bn-editor]:pointer-events-none">
                <BlockEditor
                  initialContent={project.description}
                  onChange={() => {}}
                  className="[&_.bn-editor]:min-h-0"
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {project.endDate && (
              <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Due Date</p>
                <p className="text-sm text-[#F5F5F5]">{formatDate(project.endDate)}</p>
              </div>
            )}
            {area && (
              <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Area</p>
                <p className="text-sm text-[#F5F5F5]">{area.icon} {area.name}</p>
              </div>
            )}
            {project.region && (
              <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Region</p>
                <p className="text-sm text-[#F5F5F5]">{project.region}</p>
              </div>
            )}
          </div>

          {/* Milestones */}
          <MilestonesSection projectId={project.id} initial={initialMilestones} />

          {/* Links */}
          <BookmarksSection projectId={project.id} initial={initialBookmarks} />
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
          {projectTasks.length === 0 ? (
            <p className="text-sm text-[#4B5563] text-center py-12">No tasks linked to this project.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Due</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wide">⚡</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-[#6B7280] uppercase tracking-wide">⭐</th>
                </tr>
              </thead>
              <tbody>
                {projectTasks.map(task => (
                  <tr key={task.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-[#F5F5F5]">{task.title}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs', task.dueDate && isOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#6B7280]')}>
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {task.urgent && <Zap className="w-3.5 h-3.5 text-[#EF4444] mx-auto" />}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {task.important && <Star className="w-3.5 h-3.5 text-[#F59E0B] mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-3">
          {projectNotes.length === 0 ? (
            <p className="text-sm text-[#4B5563] text-center py-12">No notes linked to this project.</p>
          ) : (
            projectNotes.map(note => (
              <div key={note.id} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2 mb-1">
                  {note.pinned && <span className="text-xs text-[#F59E0B]">📌 Pinned</span>}
                  <h3 className="text-sm font-medium text-[#F5F5F5]">{note.title}</h3>
                </div>
                {note.contentPlaintext && (
                  <p className="text-xs text-[#6B7280] line-clamp-2">{note.contentPlaintext}</p>
                )}
                <p className="text-xs text-[#4B5563] mt-1">{formatDate(note.createdAt.toISOString())}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="text-center py-16">
          <FileText className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">Documents coming soon.</p>
        </div>
      )}

      {activeTab === 'bases' && (
        <div className="text-center py-16">
          <Database className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">Linked bases coming soon.</p>
        </div>
      )}

      {activeTab === 'contacts' && (
        <TeamTab
          projectId={project.id}
          initialProjectContacts={initialProjectContacts}
          workspaceContacts={workspaceContacts}
        />
      )}
    </div>
  )
}
