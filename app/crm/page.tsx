import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { contacts, organisations } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { WorkspaceId } from '@/types'
import { CRMClient } from './crm-client'

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = (workspace ?? 'byron-film') as WorkspaceId

  const [allContacts, allOrgs] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.workspaceId, workspaceId)).orderBy(desc(contacts.createdAt)),
    db.select().from(organisations).where(eq(organisations.workspaceId, workspaceId)).orderBy(desc(organisations.createdAt)),
  ])

  return (
    <div className="flex flex-col h-full">
      <CRMClient contacts={allContacts} organisations={allOrgs} workspaceId={workspaceId} />
    </div>
  )
}
