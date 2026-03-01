import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { notes } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { formatRelativeDate } from '@/lib/utils'

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const allNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.workspaceId, workspaceId))
    .orderBy(desc(notes.updatedAt))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Notes</h1>
      </div>

      {allNotes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No notes yet.</p>
          <p className="text-xs text-[#4B5563] mt-1">Notes editor coming soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allNotes.map(note => (
            <div key={note.id} className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-[#F5F5F5]">{note.title}</h3>
                {note.pinned && <span className="text-xs text-[#6B7280]">Pinned</span>}
              </div>
              {note.contentPlaintext && (
                <p className="text-xs text-[#6B7280] line-clamp-3 mb-2">{note.contentPlaintext}</p>
              )}
              <p className="text-xs text-[#4B5563]">{formatRelativeDate(note.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
