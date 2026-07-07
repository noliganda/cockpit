import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function DocumentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-6">
      <h1 className="font-display text-[26px] font-medium text-[#E8DFCE] mb-2">Documents</h1>
      <p className="text-sm text-[#7A6F55]">Coming soon.</p>
    </div>
  )
}
