'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckSquare, FileText, Database, Users, FolderOpen, Zap, Star, Plus, Trash2, Check, ExternalLink, Hash } from 'lucide-react'
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
  { id: 'team', label: 'Team', icon: Users },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'bases', label: 'Bases', icon: Database },
] as const

type TabId = typeof TABS[number]['id']

const STATUS_COLORS: Record<string, string> = {
  Planning: 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]',
  Active: 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  'On Hold': 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]',
  Completed: 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]',
  Archived: 'text-[#4B5563] bg-[rgba(75,85,99,0.12)]',
}

const CONTACT_ROLES = ['Team', 'Client', 'Contractor', 'Supplier', 'Consultant']

const BOOKMARK_PRESETS = [
  { title: 'Google Drive', url: 'https://drive.google.com' },
  { title: 'Slack Channel', url: 'https://slack.com' },
  { title: 'Frame.io', url: 'https://frame.io' },
  { title: 'Xero Project', url: 'https://xero.com' },
]

export function ProjectDetailClient({
  project, projectTasks, projectNotes, area, progress,
  initialMilestones, initialBookmarks, initialProjectContacts, workspaceContacts
}: ProjectDetailClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Milestones state
  const [milestones, setMilestones] = useState(initialMilestones)
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneDate, setNewMilestoneDate] = useState('')
  const [addingMilestone, setAddingMilestone] = useState(false)

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState(initialBookmarks)
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('')
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('')
  // Project contacts state
  const [projectContacts, setProjectContacts] = useState(initialProjectContacts)
  const [addContactId, setAddContactId] = useState('')
  const [addContactRole, setAddContactRole] = useState('Team')
  const [addingContact, setAddingContact] = useState(false)

  // --- Milestone handlers ---
  async function addMilestone() {
    if (!newMilestoneTitle.trim()) return
    setAddingMilestone(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newMilestoneTitle.trim(), date: newMilestoneDate || undefined }),
      })
      if (res.ok) {
        const m = await res.json() as Milestone
        setMilestones(prev => [...prev, m].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')))
        setNewMilestoneTitle('')
        setNewMilestoneDate('')
      }
    } finally { setAddingMilestone(false) }
  }

  async function toggleMilestone(m: Milestone) {
    const newStatus = m.status === 'completed' ? 'pending' : 'completed'
    const res = await fetch(`/api/projects/${project.id}/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x))
    }
  }

  async function deleteMilestone(id: string) {
    await fetch(`/api/projects/${project.id}/milestones/${id}`, { method: 'DELETE' })
    setMilestones(prev => prev.filter(m => m.id !== id))
  }

  // --- Bookmark handlers ---
  async function addBookmark(title?: string, url?: string) {
    const t = title ?? newBookmarkTitle.trim()
    const u = url ?? newBookmarkUrl.trim()
    if (!t || !u) return
    const res = await fetch(`/api/projects/${project.id}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t, url: u }),
    })
    if (res.ok) {
      const b = await res.json() as Bookmark
      setBookmarks(prev => [b, ...prev])
      setNewBookmarkTitle('')
      setNewBookmarkUrl('')
    }
  }

  async function deleteBookmark(id: string) {
    await fetch(`/api/projects/${project.id}/bookmarks/${id}`, { method: 'DELETE' })
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  // --- Contact handlers ---
  async function addContact() {
    if (!addContactId) return
    setAddingContact(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: addContactId, role: addContactRole }),
      })
      if (res.ok) {
        const pc = await res.json() as ProjectContact
        const contact = workspaceContacts.find(c => c.id === addContactId)
        if (contact) {
          setProjectContacts(prev => [...prev, { ...pc, contact }])
        }
        setAddContactId('')
        setAddContactRole('Team')
      }
    } finally { setAddingContact(false) }
  }

  async function removeContact(pcId: string) {
    await fetch(`/api/projects/${project.id}/contacts/${pcId}`, { method: 'DELETE' })
    setProjectContacts(prev => prev.filter(pc => pc.id !== pcId))
  }

  function downloadVCF(contact: Contact) {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${contact.name}`,
      contact.mobile ? `TEL;TYPE=CELL:${contact.mobile}` : '',
      contact.phone ? `TEL;TYPE=WORK:${contact.phone}` : '',
      contact.email ? `EMAIL:${contact.email}` : '',
      contact.company ? `ORG:${contact.company}` : '',
      contact.role ? `TITLE:${contact.role}` : '',
      contact.address ? `ADR:;;${contact.address};;;;` : '',
      'END:VCARD',
    ].filter(Boolean).join('\n')

    const blob = new Blob([lines], { type: 'text/vcard' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${contact.name.replace(/\s+/g, '_')}.vcf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const today = new Date().toISOString().split('T')[0]

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
          { label: 'Budget', value: project.budget
              ? (Number(project.budget) < 0
                  ? `-$${Math.abs(Number(project.budget)).toLocaleString()}`
                  : `$${Number(project.budget).toLocaleString()}`)
              : '—' },
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
              {tab.id === 'team' && projectContacts.length > 0 && (
                <span className="text-xs font-mono text-[#6B7280] bg-[rgba(255,255,255,0.06)] px-1.5 py-0.5 rounded-full">{projectContacts.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Description */}
          {project.description && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Description</h3>
              <div className="text-sm [&_.bn-editor]:pointer-events-none">
                <BlockEditor initialContent={project.description} onChange={() => {}} className="[&_.bn-editor]:min-h-0" />
              </div>
            </div>
          )}

          {/* Quick info */}
          <div className="grid grid-cols-2 gap-3">
            {project.endDate && (
              <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">End Date</p>
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
            {project.slackChannelName && (
              <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Slack Channel</p>
                <a
                  href={project.slackChannelId ? `slack://channel?team=&id=${project.slackChannelId}` : '#'}
                  className="inline-flex items-center gap-1.5 text-sm text-[#4A90E2] hover:text-[#74B0F4] transition-colors"
                  title="Open in Slack"
                >
                  <Hash className="w-3.5 h-3.5" />
                  {project.slackChannelName.replace(/^#/, '')}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            )}
          </div>

          {/* Milestones */}
          <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#F5F5F5]">Milestones</h3>
              <span className="text-xs text-[#6B7280]">{milestones.filter(m => m.status === 'completed').length}/{milestones.length} done</span>
            </div>

            {milestones.length > 0 && (
              <div className="space-y-2 mb-4">
                {milestones.map(m => {
                  const overdue = m.date && m.date < today && m.status !== 'completed'
                  return (
                    <div key={m.id} className="flex items-center gap-3 group">
                      <button
                        onClick={() => toggleMilestone(m)}
                        className={cn(
                          'w-5 h-5 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors',
                          m.status === 'completed'
                            ? 'bg-[#22C55E] border-[#22C55E]'
                            : 'border-[rgba(255,255,255,0.16)] hover:border-[rgba(255,255,255,0.30)]'
                        )}
                      >
                        {m.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-sm', m.status === 'completed' ? 'line-through text-[#6B7280]' : overdue ? 'text-[#EF4444]' : 'text-[#F5F5F5]')}>
                          {m.title}
                        </span>
                        {m.date && (
                          <span className={cn('text-xs ml-2', overdue ? 'text-[#EF4444]' : 'text-[#6B7280]')}>
                            {formatDate(m.date)}{overdue ? ' · Overdue' : ''}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMilestone(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7280] hover:text-[#EF4444] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add milestone inline */}
            <div className="flex items-center gap-2">
              <input
                value={newMilestoneTitle}
                onChange={e => setNewMilestoneTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addMilestone() }}
                placeholder="Add milestone..."
                className="flex-1 px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <input
                type="date"
                value={newMilestoneDate}
                onChange={e => setNewMilestoneDate(e.target.value)}
                className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none [color-scheme:dark]"
              />
              <button
                onClick={addMilestone}
                disabled={addingMilestone || !newMilestoneTitle.trim()}
                className="p-2 rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Links */}
          <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4">Links</h3>

            {/* Preset buttons */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {BOOKMARK_PRESETS.map(preset => (
                <button
                  key={preset.title}
                  onClick={() => addBookmark(preset.title, preset.url)}
                  className="text-xs px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#F5F5F5] hover:border-[rgba(255,255,255,0.10)] transition-colors"
                >
                  + {preset.title}
                </button>
              ))}
            </div>

            {bookmarks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {bookmarks.map(b => (
                  <div key={b.id} className="flex items-center gap-2 group">
                    <ExternalLink className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                    <a href={b.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-sm text-[#F5F5F5] hover:text-[#A0A0A0] truncate transition-colors">
                      {b.title}
                    </a>
                    <span className="text-xs text-[#4B5563] truncate max-w-[120px] hidden sm:block">{b.url}</span>
                    <button
                      onClick={() => deleteBookmark(b.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7280] hover:text-[#EF4444] transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add link inline */}
            <div className="flex items-center gap-2">
              <input
                value={newBookmarkTitle}
                onChange={e => setNewBookmarkTitle(e.target.value)}
                placeholder="Title"
                className="w-28 px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <input
                value={newBookmarkUrl}
                onChange={e => setNewBookmarkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addBookmark() }}
                placeholder="https://..."
                className="flex-1 px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
              />
              <button
                onClick={() => addBookmark()}
                disabled={!newBookmarkTitle.trim() || !newBookmarkUrl.trim()}
                className="p-2 rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks tab */}
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
                    <td className="px-4 py-2.5"><span className="text-sm text-[#F5F5F5]">{task.title}</span></td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs', task.dueDate && isOverdue(task.dueDate) ? 'text-[#EF4444]' : 'text-[#6B7280]')}>
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">{task.urgent && <Zap className="w-3.5 h-3.5 text-[#EF4444] mx-auto" />}</td>
                    <td className="px-2 py-2.5 text-center">{task.important && <Star className="w-3.5 h-3.5 text-[#F59E0B] mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {projectNotes.length === 0 ? (
            <p className="text-sm text-[#4B5563] text-center py-12">No notes linked to this project.</p>
          ) : projectNotes.map(note => (
            <div key={note.id} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 mb-1">
                {note.pinned && <span className="text-xs text-[#F59E0B]">📌 Pinned</span>}
                <h3 className="text-sm font-medium text-[#F5F5F5]">{note.title}</h3>
              </div>
              {note.contentPlaintext && <p className="text-xs text-[#6B7280] line-clamp-2">{note.contentPlaintext}</p>}
              <p className="text-xs text-[#4B5563] mt-1">{formatDate(note.createdAt.toISOString())}</p>
            </div>
          ))}
        </div>
      )}

      {/* Team tab */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Contact cards */}
          {projectContacts.length === 0 ? (
            <p className="text-sm text-[#4B5563] text-center py-8">No team contacts yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projectContacts.map(pc => {
                const c = pc.contact!
                return (
                  <div key={pc.id} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] group">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F5]">{c.name}</p>
                        <p className="text-xs text-[#6B7280]">{pc.role} {c.company ? `· ${c.company}` : ''}</p>
                      </div>
                      <button
                        onClick={() => removeContact(pc.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7280] hover:text-[#EF4444] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {(c.mobile ?? c.phone) && (
                        <a href={`tel:${c.mobile ?? c.phone}`} className="text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
                          {c.mobile ?? c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors">
                          {c.email}
                        </a>
                      )}
                      <button
                        onClick={() => downloadVCF(c)}
                        className="text-xs text-[#4B5563] hover:text-[#A0A0A0] transition-colors ml-auto"
                      >
                        ↓ VCF
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add contact */}
          {workspaceContacts.length > 0 && (
            <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Add Contact</h3>
              <div className="flex items-center gap-2">
                <select
                  value={addContactId}
                  onChange={e => setAddContactId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
                >
                  <option value="">— Select contact —</option>
                  {workspaceContacts
                    .filter(c => !projectContacts.some(pc => pc.contactId === c.id))
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
                <select
                  value={addContactRole}
                  onChange={e => setAddContactRole(e.target.value)}
                  className="px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none appearance-none"
                >
                  {CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button
                  onClick={addContact}
                  disabled={!addContactId || addingContact}
                  className="px-3 py-2 rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-sm hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
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
    </div>
  )
}
