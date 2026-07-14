import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import type { WorkspaceId } from '@/types'
import { ContactsClient } from './contacts-client'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = (workspace ?? 'byron-film') as WorkspaceId

  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId))
    .orderBy(desc(contacts.createdAt))

  return (
    <div className="flex flex-col h-full">
      <ContactsClient key={workspaceId} contacts={allContacts} workspaceId={workspaceId} />
    </div>
  )
}
