import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-2">OPS Dashboard</h1>
        <p className="text-sm text-[#A0A0A0]">Phase 1 foundation complete. UI phases coming next.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Byron Film', color: '#D4A017', slug: 'byron-film' },
            { label: 'KORUS Group', color: '#008080', slug: 'korus' },
            { label: 'Personal', color: '#F97316', slug: 'personal' },
          ].map(ws => (
            <div
              key={ws.slug}
              className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]"
              style={{ borderLeftColor: ws.color, borderLeftWidth: 2 }}
            >
              <p className="text-sm font-medium text-[#F5F5F5]">{ws.label}</p>
              <p className="text-xs text-[#6B7280] mt-1">Ready</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
