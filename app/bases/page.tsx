import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import BasesClient from './bases-client'

export default async function BasesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <BasesClient />
}
