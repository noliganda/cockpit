import { redirect, notFound } from "next/navigation"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { sprints, tasks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SprintBurndown } from "./sprint-burndown"

export default async function SprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params
  const [sprint] = await db.select().from(sprints).where(eq(sprints.id, id)).limit(1)
  if (!sprint) notFound()

  const sprintTasks = await db.select().from(tasks).where(eq(tasks.sprintId, id))
  const completed = sprintTasks.filter(t => ["Delivered", "Won", "Completed", "Paid"].includes(t.status)).length
  const progress = sprintTasks.length > 0 ? Math.round((completed / sprintTasks.length) * 100) : 0

  const statuses = [...new Set(sprintTasks.map(t => t.status))]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/sprints" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sprints
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-1">{sprint.name}</h1>
        {sprint.goal && <p className="text-sm text-[#A0A0A0]">{sprint.goal}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Status", value: sprint.status ?? "planning" },
          { label: "Tasks", value: String(sprintTasks.length) },
          { label: "Progress", value: `${progress}%` },
          { label: "End Date", value: sprint.endDate ? formatDate(sprint.endDate) : "—" },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-[#F5F5F5] font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      {sprintTasks.length > 0 && (
        <div className="mb-8">
          <SprintBurndown
            totalTasks={sprintTasks.length}
            completedTasks={completed}
            startDate={sprint.startDate}
            endDate={sprint.endDate}
          />
        </div>
      )}

      <h2 className="text-sm font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">Tasks</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {statuses.length === 0 ? (
          <p className="text-sm text-[#4B5563]">No tasks in this sprint yet.</p>
        ) : statuses.map(status => {
          const statusTasks = sprintTasks.filter(t => t.status === status)
          return (
            <div key={status} className="flex-shrink-0 w-56">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide">{status}</h3>
                <span className="text-xs text-[#6B7280] font-mono">{statusTasks.length}</span>
              </div>
              <div className="space-y-2">
                {statusTasks.map(task => (
                  <div key={task.id} className="p-3 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] transition-colors">
                    <p className="text-sm text-[#F5F5F5] leading-snug">{task.title}</p>
                    {task.assignee && (
                      <p className="text-xs text-[#6B7280] mt-1">{task.assignee}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
