import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { projects, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!project) notFound()

  const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, id))
  const completed = projectTasks.filter(t => ['Done', 'Cancelled', 'Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)).length
  const progress = projectTasks.length > 0 ? Math.round((completed / projectTasks.length) * 100) : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-1">{project.name}</h1>
        {project.description && <p className="text-sm text-[#A0A0A0]">{project.description}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Status', value: project.status ?? 'active' },
          { label: 'Tasks', value: String(projectTasks.length) },
          { label: 'Progress', value: `${progress}%` },
          { label: 'Budget', value: project.budget ? `$${project.budget}` : '—' },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-[#F5F5F5] font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
        <h2 className="text-sm font-semibold text-[#F5F5F5] mb-4">Linked Tasks ({projectTasks.length})</h2>
        {projectTasks.length === 0 ? (
          <p className="text-sm text-[#4B5563] py-4">No tasks linked to this project.</p>
        ) : (
          <div className="space-y-2">
            {projectTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
                <span className="text-sm text-[#F5F5F5] flex-1">{task.title}</span>
                {task.dueDate && <span className="text-xs text-[#6B7280]">{formatDate(task.dueDate)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
