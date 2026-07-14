import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, Linkedin } from 'lucide-react'

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1)
  if (!contact) notFound()

  const fields = [
    { label: 'Company', value: contact.company },
    { label: 'Role', value: contact.role },
    { label: 'Address', value: contact.address },
    { label: 'Pipeline Stage', value: contact.pipelineStage },
    { label: 'Source', value: contact.source },
  ].filter(f => f.value)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/contacts" className="inline-flex items-center gap-1.5 text-sm text-[#7A6F55] hover:text-[#E8DFCE] mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Contacts
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">{contact.name}</h1>
        {contact.pipelineStage && (
          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(167,155,120,0.13)] text-[#A79B78]">{contact.pipelineStage}</span>
        )}
      </div>

      {/* Contact links */}
      <div className="flex flex-wrap gap-3 mb-6">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
            <Mail className="w-3.5 h-3.5" />{contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
            <Phone className="w-3.5 h-3.5" />{contact.phone}
          </a>
        )}
        {contact.website && (
          <a href={contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
            <Globe className="w-3.5 h-3.5" />{contact.website}
          </a>
        )}
        {contact.linkedinUrl && (
          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
            <Linkedin className="w-3.5 h-3.5" />LinkedIn
          </a>
        )}
      </div>

      {/* Fields */}
      <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] mb-4">
        <div className="space-y-3">
          {fields.map(field => (
            <div key={field.label} className="flex items-start gap-4">
              <span className="text-xs text-[#7A6F55] uppercase tracking-wide w-28 shrink-0 pt-0.5">{field.label}</span>
              <span className="text-sm text-[#E8DFCE]">{field.value}</span>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-[#5C5340]">No additional details.</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="p-4 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)]">
          <h2 className="text-xs font-semibold text-[#7A6F55] uppercase tracking-wide mb-2">Notes</h2>
          <p className="text-sm text-[#A79B78] whitespace-pre-wrap">{contact.notes}</p>
        </div>
      )}
    </div>
  )
}
