import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { sprints, tasks } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function SprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const [allSprints, allTasks] = await Promise.all([
    db.select().from(sprints).where(eq(sprints.workspaceId, workspaceId)).orderBy(desc(sprints.createdAt)),
    db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId)),
  ])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Sprints</h1>
      </div>

      {allSprints.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No sprints yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allSprints.map(sprint => {
            const sprintTasks = allTasks.filter(t => t.sprintId === sprint.id)
            const completed = sprintTasks.filter(t => ['Delivered', 'Won', 'Completed', 'Paid'].includes(t.status)).length
            const progress = sprintTasks.length > 0 ? Math.round((completed / sprintTasks.length) * 100) : 0

            return (
              <Link key={sprint.id} href={`/sprints/${sprint.id}`}
                className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all block">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F5F5F5]">{sprint.name}</h3>
                    {sprint.goal && <p className="text-xs text-[#6B7280] mt-0.5">{sprint.goal}</p>}
                  </div>
                  {sprint.status && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{sprint.status}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-[#6B7280]">{sprintTasks.length} tasks</span>
                  {sprint.startDate && <span className="text-xs text-[#6B7280]">{formatDate(sprint.startDate)}</span>}
                  {sprint.endDate && <span className="text-xs text-[#6B7280]">→ {formatDate(sprint.endDate)}</span>}
                  <span className="text-xs font-mono text-[#A0A0A0]">{progress}% done</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
