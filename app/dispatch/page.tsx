import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { DispatchClient } from './dispatch-client'

export default async function DispatchPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <DispatchClient />
}
