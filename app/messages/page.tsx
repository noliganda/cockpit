import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { commItems } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { MessagesClient, type CommItemView } from './messages-client'

export const dynamic = 'force-dynamic'

function toView(row: typeof commItems.$inferSelect): CommItemView {
  return {
    id: row.id,
    source: row.source,
    workspaceId: row.workspaceId,
    externalId: row.externalId,
    sender: row.sender,
    subject: row.subject,
    preview: row.preview,
    classification: row.classification,
    actionTaken: row.actionTaken,
    draftStatus: row.draftStatus,
    urgency: row.urgency,
    messageTs: row.messageTs.toISOString(),
    runId: row.runId,
    linkedTaskId: row.linkedTaskId,
    account: row.account,
    sourceUrl: row.sourceUrl,
  }
}

export default async function MessagesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [feed, drafts] = await Promise.all([
    db.select().from(commItems).orderBy(desc(commItems.messageTs), desc(commItems.id)).limit(100),
    db.select().from(commItems).where(eq(commItems.draftStatus, 'awaiting-review'))
      .orderBy(desc(commItems.messageTs)).limit(50),
  ])

  return <MessagesClient initialItems={feed.map(toView)} initialDrafts={drafts.map(toView)} />
}
