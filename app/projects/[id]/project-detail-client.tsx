'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckSquare, FileText, Database, Users, FolderOpen, Zap, Star } from 'lucide-react'
import { cn, formatDate, isOverdue } from '@/lib/utils'
import { type Project, type Task, type Area, type Note } from '@/types'
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(() => import('@/components/block-editor').then(m => m.BlockEditor), { ssr: false })

interface ProjectDetailClientProps {
  project: Project
  projectTasks: Task[]
  projectNotes: Note[]
  area: Area | null
  progress: number
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: FolderOpen },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'bases', label: 'Bases', icon: Database },
  { id: 'contacts', label: 'Contacts', icon: Users },
] as const

type TabId = typeof TABS[number]['id']

const STATUS_COLORS: Record<string, string> = {
  Planning: 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]',
  Active: 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]',
  'On Hold': 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]',
  Completed: 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]',
  Archived: 'text-[#4B5563] bg-[rgba(75,85,99,0.12)]',
}

export function ProjectDetailClient({ project, projectTasks, projectNotes, area, progress }: ProjectDetailClientProps) {
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
            {project.startDate && (
              <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Start Date</p>
                <p className="text-sm text-[#F5F5F5]">{formatDate(project.startDate)}</p>
              </div>
            )}
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
          </div>
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
        <div className="text-center py-16">
          <Users className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">Linked contacts coming soon.</p>
        </div>
      )}
    </div>
  )
}
