'use client'
import { useState } from 'react'
import { Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { type WorkspaceId, type Project, type Task } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'
import { useRouter } from 'next/navigation'

interface ProjectsClientProps {
  initialProjects: Project[]
  allTasks: Task[]
  workspaceId: WorkspaceId
}

export function ProjectsClient({ initialProjects, allTasks, workspaceId }: ProjectsClientProps) {
  const [projects, setProjects] = useState(initialProjects)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const { workspace } = useWorkspace()
  const router = useRouter()

  const getProgress = (projectId: string) => {
    const projectTasks = allTasks.filter(t => t.projectId === projectId)
    if (projectTasks.length === 0) return 0
    const done = projectTasks.filter(t => ['Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)).length
    return Math.round((done / projectTasks.length) * 100)
  }

  const getTaskCount = (projectId: string) => allTasks.filter(t => t.projectId === projectId).length

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description || undefined, workspaceId }),
      })
      if (res.ok) {
        const project = await res.json() as Project
        setProjects(prev => [project, ...prev])
        setName(''); setDescription(''); setShowCreate(false)
        router.refresh()
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Projects</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors">
          <Plus className="w-4 h-4" /> New project
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" autoFocus
              className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
              className="w-full px-3 py-2 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving || !name.trim()}
                className="px-4 py-1.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors">
                {saving ? 'Creating...' : 'Create project'}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => {
            const progress = getProgress(project.id)
            const taskCount = getTaskCount(project.id)
            return (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all block">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#F5F5F5] flex-1 mr-2">{project.name}</h3>
                  <ExternalLink className="w-3.5 h-3.5 text-[#4B5563] shrink-0" />
                </div>
                {project.description && (
                  <p className="text-xs text-[#6B7280] mb-4 line-clamp-2">{project.description}</p>
                )}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#6B7280]">{taskCount} tasks</span>
                    <span className="text-xs font-mono text-[#A0A0A0]">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: workspace.color }} />
                  </div>
                </div>
                {project.status && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{project.status}</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
