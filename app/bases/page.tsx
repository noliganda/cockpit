import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { listBases, listTables } from '@/lib/nocodb'
import { BasesClient } from './bases-client'

export default async function BasesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let basesWithTables: Array<{ id: string; title: string; tables: Array<{ id: string; title: string }> }> = []

  try {
    const bases = await listBases()
    basesWithTables = await Promise.all(
      bases.map(async (base) => {
        try {
          const tables = await listTables(base.id)
          return { ...base, tables }
        } catch {
          return { ...base, tables: [] }
        }
      })
    )
  } catch (err) {
    console.error('Failed to fetch NocoDB bases:', err)
  }

  return <BasesClient initialBases={basesWithTables} />
}
