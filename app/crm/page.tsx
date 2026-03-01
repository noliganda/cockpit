import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { workspace } = await searchParams
  const workspaceId = workspace ?? 'byron-film'

  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.workspaceId, workspaceId))
    .orderBy(desc(contacts.createdAt))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">CRM</h1>
      </div>

      {allContacts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#4B5563]">No contacts yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  {['Name', 'Company', 'Email', 'Phone', 'Pipeline Stage'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allContacts.map(contact => (
                  <tr key={contact.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/crm/${contact.id}`} className="text-sm text-[#F5F5F5] hover:text-white transition-colors">
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-[#A0A0A0]">{contact.company ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-[#A0A0A0]">{contact.email ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-[#A0A0A0]">{contact.phone ?? '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {contact.pipelineStage ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{contact.pipelineStage}</span>
                      ) : (
                        <span className="text-sm text-[#4B5563]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {allContacts.map(contact => (
              <div key={contact.id} className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/crm/${contact.id}`} className="text-sm font-medium text-[#F5F5F5] hover:text-white transition-colors">
                    {contact.name}
                  </Link>
                  {contact.pipelineStage && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{contact.pipelineStage}</span>
                  )}
                </div>
                {contact.company && (
                  <p className="text-xs text-[#6B7280] mb-1">{contact.company}</p>
                )}
                {contact.email && (
                  <p className="text-xs text-[#A0A0A0]">{contact.email}</p>
                )}
                {contact.phone && (
                  <p className="text-xs text-[#A0A0A0] mt-0.5">{contact.phone}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
