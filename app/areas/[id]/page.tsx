import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { areas, projects, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const [area] = await db.select().from(areas).where(eq(areas.id, id)).limit(1)
  if (!area) notFound()

  const [areaProjects, areaTasks] = await Promise.all([
    db.select().from(projects).where(eq(projects.areaId, id)),
    db.select().from(tasks).where(eq(tasks.areaId, id)),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Link href="/areas" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Areas
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          {area.icon && <span className="text-2xl">{area.icon}</span>}
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{area.name}</h1>
        </div>
        {area.description && <p className="text-sm text-[#A0A0A0]">{area.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Projects', value: String(areaProjects.length) },
          { label: 'Tasks', value: String(areaTasks.length) },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-[#F5F5F5] font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] mb-4">
        <h2 className="text-sm font-semibold text-[#F5F5F5] mb-4">Projects ({areaProjects.length})</h2>
        {areaProjects.length === 0 ? (
          <p className="text-sm text-[#4B5563] py-4">No projects in this area.</p>
        ) : (
          <div className="space-y-2">
            {areaProjects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:opacity-80 transition-opacity">
                <span className="text-sm text-[#F5F5F5] flex-1">{project.name}</span>
                {project.status && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{project.status}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
        <h2 className="text-sm font-semibold text-[#F5F5F5] mb-4">Tasks ({areaTasks.length})</h2>
        {areaTasks.length === 0 ? (
          <p className="text-sm text-[#4B5563] py-4">No tasks in this area.</p>
        ) : (
          <div className="space-y-2">
            {areaTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{task.status}</span>
                <span className="text-sm text-[#F5F5F5] flex-1">{task.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
