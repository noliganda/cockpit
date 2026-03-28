import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { gte, and, isNotNull } from 'drizzle-orm'
import Link from 'next/link'

export default async function MetricsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Compute live summary stats from canonical activity_log
  const recentEvents = await db.select({
    category: activityLog.category,
    durationMinutes: activityLog.durationMinutes,
    estimatedManualMinutes: activityLog.estimatedManualMinutes,
    apiCostUsd: activityLog.apiCostUsd,
  })
    .from(activityLog)
    .where(and(
      gte(activityLog.createdAt, thirtyDaysAgo),
      isNotNull(activityLog.category),
    ))

  const totalEvents = recentEvents.length
  const totalManualMins = recentEvents.reduce((s, e) => s + (e.estimatedManualMinutes ?? 0), 0)
  const totalDurationMins = recentEvents.reduce((s, e) => s + (e.durationMinutes ?? 0), 0)
  const hoursSaved = (totalManualMins - totalDurationMins) / 60
  const totalCost = recentEvents.reduce((s, e) => s + (e.apiCostUsd ?? 0), 0)
  const valueGenerated = hoursSaved * 75

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-2">Metrics</h1>
      <p className="text-sm text-[#A0A0A0] mb-8">Live from canonical operational log (last 30 days).</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Estimated Hours Saved</p>
          <p className="text-3xl font-bold text-[#F5F5F5] font-mono">{hoursSaved > 0 ? `${hoursSaved.toFixed(1)}h` : '—'}</p>
          <p className="text-xs text-[#4B5563] mt-1">vs manual baseline</p>
        </div>
        <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Productivity Events (30d)</p>
          <p className="text-3xl font-bold text-[#F5F5F5] font-mono">{totalEvents}</p>
          <p className="text-xs text-[#4B5563] mt-1">API cost: ${totalCost.toFixed(2)}</p>
        </div>
        <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Value Generated</p>
          <p className={`text-3xl font-bold font-mono ${valueGenerated > 0 ? 'text-[#22C55E]' : 'text-[#F5F5F5]'}`}>
            {valueGenerated > 0 ? `$${valueGenerated.toFixed(0)}` : '—'}
          </p>
          <p className="text-xs text-[#4B5563] mt-1">Est. @$75/hr</p>
        </div>
      </div>

      <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] space-y-3">
        <p className="text-sm text-[#A0A0A0]">View the full board-level dashboards:</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/metrics/productivity" className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-sm font-medium hover:bg-[#222222] transition-colors">
            📊 AI Productivity Comparison
          </Link>
          <Link href="/metrics/korus" className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] text-sm font-medium hover:bg-[#222222] transition-colors">
            🌏 KORUS APAC Board Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
