import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { AgentsClient } from './agents-client'

export default async function AgentsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <AgentsClient />
}
