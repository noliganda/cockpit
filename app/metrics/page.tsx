import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function MetricsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-2">Metrics</h1>
      <p className="text-sm text-[#A0A0A0] mb-8">Cost efficiency and ROI tracking.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Estimated Hours Saved', value: '—', sub: 'Coming soon' },
          { label: 'Tasks Completed (30d)', value: '—', sub: 'Connect DB' },
          { label: 'Value Generated', value: '—', sub: 'Est. @$300/hr' },
        ].map(s => (
          <div key={s.label} className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">{s.label}</p>
            <p className="text-3xl font-bold text-[#F5F5F5] font-mono">{s.value}</p>
            <p className="text-xs text-[#4B5563] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
        <p className="text-sm text-[#A0A0A0] mb-4">View the full board-level executive dashboard:</p>
        <Link href="/metrics/korus" className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-sm font-medium hover:bg-[#222222] transition-colors">
          🌏 KORUS APAC Board Dashboard
        </Link>
      </div>
    </div>
  )
}
