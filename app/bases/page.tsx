import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { NocoDBClient } from './nocodb-client'

export default async function BasesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const nocodbUrl = process.env.NEXT_PUBLIC_NOCODB_URL ?? null

  return <NocoDBClient url={nocodbUrl} />
}
