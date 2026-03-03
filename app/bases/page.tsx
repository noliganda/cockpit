import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { userBases, userTables } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { BasesClient } from './bases-client'

export type BaseWithTables = {
  id: string
  workspaceId: string
  name: string
  description: string | null
  icon: string | null
  tables: { id: string; name: string; icon: string | null }[]
}

export default async function BasesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const bases = await db.select().from(userBases).orderBy(asc(userBases.createdAt))

  const basesWithTables: BaseWithTables[] = await Promise.all(
    bases.map(async (base) => {
      const tables = await db
        .select({ id: userTables.id, name: userTables.name, icon: userTables.icon })
        .from(userTables)
        .where(eq(userTables.baseId, base.id))
        .orderBy(asc(userTables.sortOrder), asc(userTables.createdAt))
      return { ...base, tables }
    })
  )

  return <BasesClient initialBases={basesWithTables} />
}
