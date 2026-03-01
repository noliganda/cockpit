import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function MessagesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-2">Messages</h1>
      <p className="text-sm text-[#6B7280]">Coming soon.</p>
    </div>
  )
}
