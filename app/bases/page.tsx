import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listBases, listTables } from '@/lib/nocodb'
import { BasesClient } from './bases-client'

export default async function BasesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const rawBases = await listBases()

  // Load tables for each base in parallel
  const bases = await Promise.all(
    rawBases.map(async base => ({
      ...base,
      tables: await listTables(base.id),
    }))
  )

  return <BasesClient bases={bases} />
}
