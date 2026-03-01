'use client'
import { useState, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import Link from 'next/link'
import { User, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Contact, Organisation, WorkspaceId } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'

const PIPELINE_STAGES: Record<WorkspaceId, string[]> = {
  'korus': ['Lead', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'],
  'byron-film': ['Lead', 'Proposal', 'Won', 'Lost'],
  'personal': ['Active', 'Inactive'],
}

interface CRMClientProps {
  contacts: Contact[]
  organisations: Organisation[]
  workspaceId: WorkspaceId
}

type Tab = 'contacts' | 'organisations' | 'pipeline'

export function CRMClient({ contacts: initialContacts, organisations, workspaceId }: CRMClientProps) {
  const [tab, setTab] = useState<Tab>('contacts')
  const [contacts, setContacts] = useState(initialContacts)
  const { workspace } = useWorkspace()

  const stages = PIPELINE_STAGES[workspaceId] ?? PIPELINE_STAGES['korus']

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return
    const newStage = result.destination.droppableId
    const contactId = result.draggableId

    // Optimistic update
    setContacts(prev => prev.map(c =>
      c.id === contactId ? { ...c, pipelineStage: newStage } : c
    ))

    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStage: newStage }),
      })
    } catch {
      // Revert on failure
      setContacts(initialContacts)
    }
  }, [initialContacts])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'contacts', label: 'Contacts' },
    { id: 'organisations', label: 'Organisations' },
    { id: 'pipeline', label: 'Pipeline' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">CRM</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] font-mono">{contacts.length} contacts</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-4 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'text-[#F5F5F5] border-current'
                  : 'text-[#6B7280] border-transparent hover:text-[#A0A0A0]'
              )}
              style={tab === t.id ? { color: workspace.color, borderColor: workspace.color } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === 'contacts' && (
          <ContactsTab contacts={contacts} />
        )}
        {tab === 'organisations' && (
          <OrgsTab organisations={organisations} />
        )}
        {tab === 'pipeline' && (
          <PipelineTab contacts={contacts} stages={stages} onDragEnd={handleDragEnd} workspaceColor={workspace.color} />
        )}
      </div>
    </div>
  )
}

function ContactsTab({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-16">
        <User className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
        <p className="text-sm text-[#4B5563]">No contacts yet</p>
      </div>
    )
  }

  return (
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
            {contacts.map(contact => (
              <tr key={contact.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
                <td className="px-4 py-2.5">
                  <Link href={`/crm/${contact.id}`} className="text-sm text-[#F5F5F5] hover:text-white transition-colors">
                    {contact.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{contact.company ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{contact.email ?? '—'}</td>
                <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{contact.phone ?? '—'}</td>
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
        {contacts.map(contact => (
          <div key={contact.id} className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4">
            <div className="flex items-start justify-between mb-2">
              <Link href={`/crm/${contact.id}`} className="text-sm font-medium text-[#F5F5F5] hover:text-white transition-colors">
                {contact.name}
              </Link>
              {contact.pipelineStage && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{contact.pipelineStage}</span>
              )}
            </div>
            {contact.company && <p className="text-xs text-[#6B7280] mb-1">{contact.company}</p>}
            {contact.email && <p className="text-xs text-[#A0A0A0]">{contact.email}</p>}
            {contact.phone && <p className="text-xs text-[#A0A0A0] mt-0.5">{contact.phone}</p>}
          </div>
        ))}
      </div>
    </>
  )
}

function OrgsTab({ organisations }: { organisations: Organisation[] }) {
  if (organisations.length === 0) {
    return (
      <div className="text-center py-16">
        <Building2 className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
        <p className="text-sm text-[#4B5563]">No organisations yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            {['Organisation', 'Industry', 'Website', 'Size', 'Stage'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {organisations.map(org => (
            <tr key={org.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
              <td className="px-4 py-2.5 text-sm text-[#F5F5F5]">{org.name}</td>
              <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{org.industry ?? '—'}</td>
              <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{org.website ?? '—'}</td>
              <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{org.size ?? '—'}</td>
              <td className="px-4 py-2.5">
                {org.pipelineStage && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">{org.pipelineStage}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PipelineTab({
  contacts,
  stages,
  onDragEnd,
  workspaceColor,
}: {
  contacts: Contact[]
  stages: string[]
  onDragEnd: (result: DropResult) => Promise<void>
  workspaceColor: string
}) {
  if (contacts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-[#4B5563]">No contacts in pipeline</p>
        <p className="text-xs text-[#4B5563] mt-1">Add contacts to see them in the pipeline</p>
      </div>
    )
  }

  const getContactsForStage = (stage: string) =>
    contacts.filter(c => c.pipelineStage === stage || (!c.pipelineStage && stage === stages[0]))

  return (
    <DragDropContext onDragEnd={(r) => { void onDragEnd(r) }}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {stages.map(stage => {
          const stageContacts = getContactsForStage(stage)
          return (
            <div key={stage} className="flex-shrink-0 w-56">
              <div className="flex items-center gap-2 mb-3 px-1">
                <h3 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide flex-1">{stage}</h3>
                <span className="text-xs font-mono text-[#4B5563]">{stageContacts.length}</span>
              </div>
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'min-h-[200px] rounded-[8px] p-2 transition-colors',
                      snapshot.isDraggingOver
                        ? 'bg-[rgba(255,255,255,0.04)]'
                        : 'bg-[rgba(255,255,255,0.02)]'
                    )}
                    style={snapshot.isDraggingOver ? { borderColor: workspaceColor, border: `1px solid ${workspaceColor}40` } : { border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {stageContacts.map((contact, index) => (
                      <Draggable key={contact.id} draggableId={contact.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              'p-3 mb-2 last:mb-0 rounded-[6px] bg-[#141414] border cursor-grab active:cursor-grabbing transition-all',
                              snapshot.isDragging
                                ? 'border-[rgba(255,255,255,0.16)] shadow-xl'
                                : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)]'
                            )}
                          >
                            <Link
                              href={`/crm/${contact.id}`}
                              className="block text-sm font-medium text-[#F5F5F5] hover:text-white mb-1 transition-colors"
                              onClick={e => snapshot.isDragging && e.preventDefault()}
                            >
                              {contact.name}
                            </Link>
                            {contact.company && (
                              <p className="text-xs text-[#6B7280]">{contact.company}</p>
                            )}
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {contact.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#6B7280]">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
