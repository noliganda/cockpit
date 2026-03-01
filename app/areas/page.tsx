import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { areas, projects, tasks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'

export default async function AreasPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allAreas, allProjects, allTasks] = await Promise.all([
    db.select().from(areas).where(eq(areas.workspaceId, workspaceId)),
    db.select().from(projects).where(eq(projects.workspaceId, workspaceId)),
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
  ])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Areas</h1>
      </div>

      {allAreas.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No areas yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAreas.map(area => {
            const areaProjects = allProjects.filter(p => p.areaId === area.id)
            const areaTasks = allTasks.filter(t => t.areaId === area.id)
            return (
              <Link key={area.id} href={`/areas/${area.id}`}
                className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all block">
                <div className="flex items-center gap-2 mb-2">
                  {area.icon && <span className="text-lg">{area.icon}</span>}
                  <h3 className="text-sm font-semibold text-[#F5F5F5]">{area.name}</h3>
                </div>
                {area.description && (
                  <p className="text-xs text-[#6B7280] mb-3 line-clamp-2">{area.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6B7280]">{areaProjects.length} projects</span>
                  <span className="text-xs text-[#6B7280]">{areaTasks.length} tasks</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
