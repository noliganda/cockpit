import { db } from '@/lib/db'
import { activityLog, tasks, projects, contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { KorusMetricsClient } from './korus-metrics-client'
import type { ActivityLogEntry } from '@/types'

export default async function KorusMetricsPage() {
  // Check auth — either main session or guest session
  const cookieStore = await cookies()
  const mainSession = cookieStore.get('ops-session')?.value
  const guestSession = cookieStore.get('ops-guest-session')?.value

  if (!mainSession && !guestSession) {
    return <KorusGuestLogin />
  }

  const [
    allKorusTasks,
    allKorusProjects,
    allKorusContacts,
    recentActivityRows,
  ] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.workspaceId, 'korus')),
    db.select().from(projects).where(eq(projects.workspaceId, 'korus')),
    db.select().from(contacts).where(eq(contacts.workspaceId, 'korus')),
    db.select({
      id: activityLog.id,
      workspaceId: activityLog.workspaceId,
      actor: activityLog.actor,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      entityTitle: activityLog.entityTitle,
      description: activityLog.description,
      metadata: activityLog.metadata,
      embeddingModel: activityLog.embeddingModel,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(eq(activityLog.workspaceId, 'korus'))
    .orderBy(desc(activityLog.createdAt))
    .limit(20),
  ])

  const recentActivity: ActivityLogEntry[] = recentActivityRows

  const completedTasks = allKorusTasks.filter(t => ['Won', 'Delivered', 'Completed', 'Paid'].includes(t.status))
  const activeCandidates = allKorusContacts.filter(c => c.tags?.includes('candidate') || c.tags?.includes('recruitment'))
  const proposalsSent = allKorusTasks.filter(t => t.status === 'Proposal').length
  const activeProjects = allKorusProjects.filter(p => p.status === 'active').length

  const metrics = {
    tasksCompleted: completedTasks.length,
    hoursSaved: Math.round(completedTasks.length * 0.5),
    emailsProcessed: recentActivity.filter(a => a.entityType === 'email').length,
    researchHours: Math.round(recentActivity.length * 0.25),
    activeCandidates: activeCandidates.length,
    proposalsSent,
    activeProjects,
    totalTasks: allKorusTasks.length,
  }

  // Pipeline stages
  const pipelineStages = ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Won']
  const pipeline = pipelineStages.map(stage => ({
    stage,
    count: allKorusTasks.filter(t => t.status === stage).length,
  }))

  // Region breakdown
  const regions = ['Singapore', 'Australia', 'France', 'Global']
  const regionData = regions.map(r => ({
    region: r,
    tasks: allKorusTasks.filter(t => t.region === r).length,
  }))

  return (
    <KorusMetricsClient
      metrics={metrics}
      recentActivity={recentActivity}
      allTasks={allKorusTasks}
      allProjects={allKorusProjects}
      allContacts={allKorusContacts}
      pipeline={pipeline}
      regionData={regionData}
    />
  )
}

function KorusGuestLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-[8px] bg-[#008080] flex items-center justify-center mx-auto mb-3 text-lg">🌏</div>
          <h1 className="text-xl font-bold text-[#F5F5F5]">KORUS Group</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Board Dashboard</p>
        </div>
        <form action="/api/auth/guest" method="post" className="space-y-4">
          <input type="password" name="password" placeholder="Access password"
            className="w-full px-4 py-3 rounded-[8px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]" />
          <button type="submit"
            className="w-full py-3 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm font-medium hover:bg-[#222222] transition-all">
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  )
}
