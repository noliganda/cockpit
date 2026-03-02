'use client'
import { useState, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { User, Building2, Plus, X, Search, Linkedin, Instagram, Globe, ExternalLink, Download, Trash2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Contact, Organisation, WorkspaceId } from '@/types'
import { PIPELINE_STAGES } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'

// ─── VCF Generation ─────────────────────────────────────────────────────────
function escapeVcf(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function contactToVCard(c: Contact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']
  const fn = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.name
  lines.push(`FN:${escapeVcf(fn)}`)
  const n = `${escapeVcf(c.lastName ?? '')};${escapeVcf(c.firstName ?? '')};;;`
  lines.push(`N:${n}`)
  if (c.company) lines.push(`ORG:${escapeVcf(c.company)}`)
  if (c.role) lines.push(`TITLE:${escapeVcf(c.role)}`)
  if (c.email) lines.push(`EMAIL;TYPE=WORK:${escapeVcf(c.email)}`)
  if (c.mobile) lines.push(`TEL;TYPE=CELL:${escapeVcf(c.mobile)}`)
  if (c.phone) lines.push(`TEL;TYPE=WORK:${escapeVcf(c.phone)}`)
  if (c.address) lines.push(`ADR;TYPE=WORK:;;${escapeVcf(c.address)};;;;`)
  if (c.linkedinUrl) lines.push(`URL:${escapeVcf(c.linkedinUrl)}`)
  else if (c.portfolioUrl) lines.push(`URL:${escapeVcf(c.portfolioUrl)}`)
  lines.push('END:VCARD')
  return lines.join('\r\n')
}

function downloadVCF(selected: Contact[]) {
  const vcf = selected.map(contactToVCard).join('\r\n')
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = selected.length === 1
    ? `${(selected[0].firstName ?? selected[0].name).toLowerCase().replace(/\s+/g, '-')}-${(selected[0].lastName ?? '').toLowerCase().replace(/\s+/g, '-')}.vcf`.replace(/-+/g, '-').replace(/-\./, '.')
    : 'contacts-export.vcf'
  a.click()
}

// ─── Portal Dropdown ─────────────────────────────────────────────────────────
function PortalDropdown({
  anchorRef,
  isOpen,
  onClose,
  children,
  minWidth = 160,
}: {
  anchorRef: React.RefObject<HTMLElement | null>
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  minWidth?: number
}) {
  if (!isOpen || typeof document === 'undefined') return null
  const rect = anchorRef.current?.getBoundingClientRect()
  if (!rect) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[6px] overflow-hidden shadow-lg"
        style={{ top: rect.bottom + 4, left: rect.left, minWidth }}
      >
        {children}
      </div>
    </>,
    document.body
  )
}

const PIPELINE_STAGES_LIST = [...PIPELINE_STAGES]

// ─── Shared Input Styles ───────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]'
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

// ─── Tag Multi-Select ──────────────────────────────────────────────────────
function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed])
    setInput('')
  }
  return (
    <div>
      <div className="flex gap-1 flex-wrap mb-1.5">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[#A0A0A0]">
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-white"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className={inputCls}
          placeholder="Add tag…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button onClick={add} className="px-3 rounded-[6px] bg-[rgba(255,255,255,0.06)] text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.10)] text-sm">+</button>
      </div>
    </div>
  )
}

// ─── Dialog Overlay ────────────────────────────────────────────────────────
function DialogOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      {children}
    </div>
  )
}

// ─── Contact Form State ────────────────────────────────────────────────────
type ContactForm = {
  firstName: string
  lastName: string
  role: string
  organisationId: string
  mobile: string
  email: string
  address: string
  linkedinUrl: string
  instagramUrl: string
  facebookUrl: string
  portfolioUrl: string
  pipelineStage: string
  tags: string[]
  nextReachDate: string
  notes: string
}

const emptyContactForm = (): ContactForm => ({
  firstName: '',
  lastName: '',
  role: '',
  organisationId: '',
  mobile: '',
  email: '',
  address: '',
  linkedinUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  portfolioUrl: '',
  pipelineStage: '',
  tags: [],
  nextReachDate: '',
  notes: '',
})

function contactToForm(c: Contact): ContactForm {
  return {
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
    role: c.role ?? '',
    organisationId: c.organisationId ?? '',
    mobile: c.mobile ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    linkedinUrl: c.linkedinUrl ?? '',
    instagramUrl: c.instagramUrl ?? '',
    facebookUrl: c.facebookUrl ?? '',
    portfolioUrl: c.portfolioUrl ?? '',
    pipelineStage: c.pipelineStage ?? '',
    tags: c.tags ?? [],
    nextReachDate: c.nextReachDate ?? '',
    notes: c.notes ?? '',
  }
}

// ─── Contact Dialog ────────────────────────────────────────────────────────
function ContactDialog({
  mode,
  contact,
  organisations,
  workspaceId,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  contact?: Contact
  organisations: Organisation[]
  workspaceId: WorkspaceId
  onClose: () => void
  onSave: (c: Contact) => void
}) {
  const [form, setForm] = useState<ContactForm>(contact ? contactToForm(contact) : emptyContactForm())
  const [saving, setSaving] = useState(false)

  const set = (field: keyof ContactForm, val: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    if (!form.firstName && !form.lastName) {
      toast.error('First name or last name required')
      return
    }
    setSaving(true)
    const name = [form.firstName, form.lastName].filter(Boolean).join(' ')
    const payload = { ...form, name, workspaceId }
    try {
      const url = mode === 'create' ? '/api/contacts' : `/api/contacts/${contact!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      const saved = await res.json() as Contact
      onSave(saved)
      toast.success(mode === 'create' ? 'Contact created' : 'Contact saved')
      onClose()
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogOverlay onClose={onClose}>
      <div className="relative w-full sm:max-w-2xl bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">{mode === 'create' ? 'New Contact' : 'Edit Contact'}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Row 1: First/Last Name */}
            <div>
              <label className={labelCls}>First Name</label>
              <input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
            </div>
            {/* Row 2: Position / Organisation */}
            <div>
              <label className={labelCls}>Position / Title</label>
              <input className={inputCls} value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Director" />
            </div>
            <div>
              <label className={labelCls}>Organisation</label>
              <select
                className={inputCls}
                value={form.organisationId}
                onChange={e => set('organisationId', e.target.value)}
              >
                <option value="">— None —</option>
                {organisations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            {/* Row 3: Mobile / Email */}
            <div>
              <label className={labelCls}>Mobile</label>
              <input className={inputCls} type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+61 4xx xxx xxx" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            {/* Row 4: Address (full width) */}
            <div className="col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </div>
            {/* Row 5: LinkedIn / Instagram */}
            <div>
              <label className={labelCls}>LinkedIn URL</label>
              <input className={inputCls} value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
            </div>
            <div>
              <label className={labelCls}>Instagram URL</label>
              <input className={inputCls} value={form.instagramUrl} onChange={e => set('instagramUrl', e.target.value)} placeholder="https://instagram.com/…" />
            </div>
            {/* Row 6: Facebook / Portfolio */}
            <div>
              <label className={labelCls}>Facebook URL</label>
              <input className={inputCls} value={form.facebookUrl} onChange={e => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/…" />
            </div>
            <div>
              <label className={labelCls}>Portfolio / Website URL</label>
              <input className={inputCls} value={form.portfolioUrl} onChange={e => set('portfolioUrl', e.target.value)} placeholder="https://…" />
            </div>
            {/* Row 7: Pipeline Stage / Tags */}
            <div>
              <label className={labelCls}>Pipeline Stage</label>
              <select className={inputCls} value={form.pipelineStage} onChange={e => set('pipelineStage', e.target.value)}>
                <option value="">— None —</option>
                {PIPELINE_STAGES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <TagsInput value={form.tags} onChange={v => setForm(prev => ({ ...prev, tags: v }))} />
            </div>
            {/* Row 8: Next Reach Date */}
            <div>
              <label className={labelCls}>Next Reach Date</label>
              <input className={inputCls} type="date" value={form.nextReachDate} onChange={e => set('nextReachDate', e.target.value)} />
            </div>
            <div />
            {/* Row 9: Notes (full width) */}
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                className={cn(inputCls, 'resize-none h-24')}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any notes…"
              />
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-[6px] bg-[#F5F5F5] text-[#0F0F0F] text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create Contact' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── Organisation Form ─────────────────────────────────────────────────────
type OrgForm = {
  name: string
  industry: string
  size: string
  website: string
  email: string
  phone: string
  address: string
  pipelineStage: string
  tags: string[]
  notes: string
}

const emptyOrgForm = (): OrgForm => ({
  name: '',
  industry: '',
  size: '',
  website: '',
  email: '',
  phone: '',
  address: '',
  pipelineStage: '',
  tags: [],
  notes: '',
})

function orgToForm(o: Organisation): OrgForm {
  return {
    name: o.name,
    industry: o.industry ?? '',
    size: o.size ?? '',
    website: o.website ?? '',
    email: o.email ?? '',
    phone: o.phone ?? '',
    address: o.address ?? '',
    pipelineStage: o.pipelineStage ?? '',
    tags: o.tags ?? [],
    notes: o.notes ?? '',
  }
}

// ─── Organisation Dialog ───────────────────────────────────────────────────
function OrgDialog({
  mode,
  org,
  workspaceId,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  org?: Organisation
  workspaceId: WorkspaceId
  onClose: () => void
  onSave: (o: Organisation) => void
}) {
  const [form, setForm] = useState<OrgForm>(org ? orgToForm(org) : emptyOrgForm())
  const [saving, setSaving] = useState(false)

  const set = (field: keyof OrgForm, val: string | string[]) =>
    setForm(prev => ({ ...prev, [field]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const payload = { ...form, workspaceId }
    try {
      const url = mode === 'create' ? '/api/organisations' : `/api/organisations/${org!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      const saved = await res.json() as Organisation
      onSave(saved)
      toast.success(mode === 'create' ? 'Organisation created' : 'Organisation saved')
      onClose()
    } catch {
      toast.error('Failed to save organisation')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogOverlay onClose={onClose}>
      <div className="relative w-full sm:max-w-xl bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">{mode === 'create' ? 'New Organisation' : 'Edit Organisation'}</h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F5F5F5] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Row 1: Name (full) */}
            <div className="col-span-2">
              <label className={labelCls}>Organisation Name</label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Organisation name" />
            </div>
            {/* Row 2: Industry / Size */}
            <div>
              <label className={labelCls}>Industry</label>
              <input className={inputCls} value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Film & TV" />
            </div>
            <div>
              <label className={labelCls}>Size (employees)</label>
              <input className={inputCls} value={form.size} onChange={e => set('size', e.target.value)} placeholder="e.g. 10–50" />
            </div>
            {/* Row 3: Website / Email */}
            <div>
              <label className={labelCls}>Website</label>
              <input className={inputCls} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@org.com" />
            </div>
            {/* Row 4: Phone / Address */}
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 2 …" />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </div>
            {/* Row 5: Pipeline Stage / Tags */}
            <div>
              <label className={labelCls}>Pipeline Stage</label>
              <select className={inputCls} value={form.pipelineStage} onChange={e => set('pipelineStage', e.target.value)}>
                <option value="">— None —</option>
                {PIPELINE_STAGES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <TagsInput value={form.tags} onChange={v => setForm(prev => ({ ...prev, tags: v }))} />
            </div>
            {/* Row 6: Notes (full) */}
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea
                className={cn(inputCls, 'resize-none h-24')}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any notes…"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-[6px] bg-[#F5F5F5] text-[#0F0F0F] text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create Organisation' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── CRMClient ─────────────────────────────────────────────────────────────
interface CRMClientProps {
  contacts: Contact[]
  organisations: Organisation[]
  workspaceId: WorkspaceId
}

type Tab = 'contacts' | 'organisations' | 'pipeline'

export function CRMClient({ contacts: initialContacts, organisations: initialOrgs, workspaceId }: CRMClientProps) {
  const [tab, setTab] = useState<Tab>('contacts')
  const [contacts, setContacts] = useState(initialContacts)
  const [organisations, setOrganisations] = useState(initialOrgs)
  const { workspace } = useWorkspace()

  const handleDragEnd = useCallback(async (result: DropResult) => {
    if (!result.destination) return
    const newStage = result.destination.droppableId
    const contactId = result.draggableId

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
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Contacts</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B7280] font-mono">{contacts.length} contacts</span>
          <button
            onClick={() => downloadVCF(contacts)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#A0A0A0] rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#222222] transition-colors"
            title="Export all contacts as VCF"
          >
            <Download className="w-3.5 h-3.5" />
            Export All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 mt-4 border-b border-[rgba(255,255,255,0.06)]">
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
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {tab === 'contacts' && (
          <ContactsTab
            contacts={contacts}
            organisations={organisations}
            workspaceId={workspaceId}
            onAdd={c => setContacts(prev => [c, ...prev])}
            onUpdate={c => setContacts(prev => prev.map(x => x.id === c.id ? c : x))}
            onDelete={ids => setContacts(prev => prev.filter(x => !ids.includes(x.id)))}
          />
        )}
        {tab === 'organisations' && (
          <OrgsTab
            organisations={organisations}
            contacts={contacts}
            workspaceId={workspaceId}
            onAdd={o => setOrganisations(prev => [o, ...prev])}
            onUpdate={o => setOrganisations(prev => prev.map(x => x.id === o.id ? o : x))}
          />
        )}
        {tab === 'pipeline' && (
          <PipelineTab
            contacts={contacts}
            stages={PIPELINE_STAGES_LIST}
            onDragEnd={handleDragEnd}
            workspaceColor={workspace.color}
          />
        )}
      </div>
    </div>
  )
}

// ─── ContactsTab ───────────────────────────────────────────────────────────
function ContactsTab({
  contacts,
  organisations,
  workspaceId,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contacts: Contact[]
  organisations: Organisation[]
  workspaceId: WorkspaceId
  onAdd: (c: Contact) => void
  onUpdate: (c: Contact) => void
  onDelete?: (ids: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [batchStageOpen, setBatchStageOpen] = useState(false)
  const batchStageRef = useRef<HTMLButtonElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return contacts
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.mobile ?? '').includes(q) ||
      (c.phone ?? '').includes(q)
    )
  }, [contacts, search])

  const selectedCount = selectedIds.size
  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id))

  function toggleSelectAll() {
    if (allFilteredSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(c => c.id)))
    setLastClickedIdx(null)
  }

  function toggleSelect(e: React.MouseEvent, idx: number, contactId: string) {
    e.stopPropagation()
    if (e.shiftKey && lastClickedIdx !== null) {
      const from = Math.min(lastClickedIdx, idx)
      const to = Math.max(lastClickedIdx, idx)
      const rangeIds = filtered.slice(from, to + 1).map(c => c.id)
      const newSet = new Set(selectedIds)
      rangeIds.forEach(id => newSet.add(id))
      setSelectedIds(newSet)
    } else {
      const newSet = new Set(selectedIds)
      if (newSet.has(contactId)) newSet.delete(contactId)
      else newSet.add(contactId)
      setSelectedIds(newSet)
      setLastClickedIdx(idx)
    }
  }

  async function batchSetStage(stage: string) {
    const ids = Array.from(selectedIds)
    await fetch('/api/contacts/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates: { pipelineStage: stage } }),
    })
    // Optimistically update via onUpdate — trigger a page refresh instead
    ids.forEach(id => {
      const c = contacts.find(x => x.id === id)
      if (c) onUpdate({ ...c, pipelineStage: stage })
    })
  }

  async function batchDelete() {
    const ids = Array.from(selectedIds)
    await fetch('/api/contacts/batch', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    setSelectedIds(new Set())
    setShowDeleteConfirm(false)
    onDelete?.(ids)
  }

  return (
    <>
      {/* Search + New */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4B5563]" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-sm text-[#F5F5F5] outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563]"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#F5F5F5] text-[#0F0F0F] text-sm font-medium hover:bg-white transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New Contact
        </button>
      </div>

      {/* Batch Toolbar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)]">
          <span className="text-xs text-[#A0A0A0] font-medium mr-1">{selectedCount} selected</span>

          {/* Change Pipeline Stage */}
          <div className="relative">
            <button
              ref={batchStageRef}
              onClick={() => setBatchStageOpen(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
            >
              Pipeline Stage <ChevronDown className="w-3 h-3" />
            </button>
            <PortalDropdown anchorRef={batchStageRef} isOpen={batchStageOpen} onClose={() => setBatchStageOpen(false)}>
              {PIPELINE_STAGES_LIST.map(s => (
                <button
                  key={s}
                  onClick={() => { setBatchStageOpen(false); void batchSetStage(s) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#A0A0A0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F5F5] transition-colors"
                >
                  {s}
                </button>
              ))}
            </PortalDropdown>
          </div>

          {/* Export VCF */}
          <button
            onClick={() => {
              const selected = contacts.filter(c => selectedIds.has(c.id))
              downloadVCF(selected)
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
          >
            <Download className="w-3 h-3" /> Export VCF
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-[6px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#EF4444] hover:bg-[rgba(239,68,68,0.10)] transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>

          {/* Deselect All */}
          <button
            onClick={() => { setSelectedIds(new Set()); setLastClickedIdx(null) }}
            className="ml-auto flex items-center p-1 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
            title="Deselect all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <User className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">{search ? 'No contacts match your search' : 'No contacts yet'}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  <th className="px-3 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 cursor-pointer accent-white"
                    />
                  </th>
                  {['Name', 'Position', 'Mobile', 'Email', 'Links', 'Pipeline Stage'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact, idx) => (
                  <tr
                    key={contact.id}
                    className={cn(
                      'border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)] cursor-pointer',
                      selectedIds.has(contact.id) && 'bg-[rgba(255,255,255,0.03)]'
                    )}
                    onClick={() => setEditing(contact)}
                  >
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => {}}
                        onClick={e => toggleSelect(e as React.MouseEvent, idx, contact.id)}
                        className="w-3.5 h-3.5 cursor-pointer accent-white"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-[#F5F5F5] hover:text-white transition-colors">
                        {contact.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[#A0A0A0]">{contact.role ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {contact.mobile ? (
                        <a href={`tel:${contact.mobile}`} className="text-sm text-[#A0A0A0] hover:text-[#F5F5F5]" onClick={e => e.stopPropagation()}>
                          {contact.mobile}
                        </a>
                      ) : <span className="text-sm text-[#4B5563]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-sm text-[#A0A0A0] hover:text-[#F5F5F5]" onClick={e => e.stopPropagation()}>
                          {contact.email}
                        </a>
                      ) : <span className="text-sm text-[#4B5563]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {contact.portfolioUrl && (
                          <a href={contact.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[#4B5563] hover:text-[#A0A0A0] transition-colors">
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {contact.linkedinUrl && (
                          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#4B5563] hover:text-[#A0A0A0] transition-colors">
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {contact.instagramUrl && (
                          <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#4B5563] hover:text-[#A0A0A0] transition-colors">
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!contact.portfolioUrl && !contact.linkedinUrl && !contact.instagramUrl && (
                          <span className="text-sm text-[#4B5563]">—</span>
                        )}
                      </div>
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
            {filtered.map((contact, idx) => (
              <div
                key={contact.id}
                className={cn(
                  'rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4 hover:border-[rgba(255,255,255,0.10)]',
                  selectedIds.has(contact.id) && 'border-[rgba(255,255,255,0.10)] bg-[#1A1A1A]'
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => {}}
                      onClick={e => toggleSelect(e as React.MouseEvent, idx, contact.id)}
                      className="w-3.5 h-3.5 cursor-pointer accent-white"
                    />
                  </div>
                  <p
                    className="text-sm font-medium text-[#F5F5F5] flex-1 cursor-pointer"
                    onClick={() => setEditing(contact)}
                  >
                    {contact.name}
                  </p>
                  {contact.pipelineStage && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0] shrink-0">{contact.pipelineStage}</span>
                  )}
                </div>
                {contact.role && <p className="text-xs text-[#6B7280] mb-1 ml-5">{contact.role}</p>}
                {contact.email && <p className="text-xs text-[#A0A0A0] ml-5">{contact.email}</p>}
                {contact.mobile && <p className="text-xs text-[#A0A0A0] mt-0.5 ml-5">{contact.mobile}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] rounded-[12px] p-6 max-w-sm w-full">
            <h2 className="text-sm font-semibold text-[#F5F5F5] mb-2">Delete {selectedCount} contact{selectedCount !== 1 ? 's' : ''}?</h2>
            <p className="text-xs text-[#6B7280] mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#F5F5F5] transition-colors">Cancel</button>
              <button onClick={() => void batchDelete()} className="px-4 py-2 text-sm font-medium bg-[#EF4444] text-white rounded-[6px] hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <ContactDialog
          mode="create"
          organisations={organisations}
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onSave={onAdd}
        />
      )}
      {editing && (
        <ContactDialog
          mode="edit"
          contact={editing}
          organisations={organisations}
          workspaceId={workspaceId}
          onClose={() => setEditing(null)}
          onSave={onUpdate}
        />
      )}
    </>
  )
}

// ─── OrgsTab ───────────────────────────────────────────────────────────────
function OrgsTab({
  organisations,
  contacts,
  workspaceId,
  onAdd,
  onUpdate,
}: {
  organisations: Organisation[]
  contacts: Contact[]
  workspaceId: WorkspaceId
  onAdd: (o: Organisation) => void
  onUpdate: (o: Organisation) => void
}) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Organisation | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return organisations
    return organisations.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.industry ?? '').toLowerCase().includes(q)
    )
  }, [organisations, search])

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4B5563]" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-sm text-[#F5F5F5] outline-none focus:border-[rgba(255,255,255,0.16)] placeholder:text-[#4B5563]"
            placeholder="Search organisations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#F5F5F5] text-[#0F0F0F] text-sm font-medium hover:bg-white transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New Organisation
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-8 h-8 text-[#4B5563] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">{search ? 'No organisations match your search' : 'No organisations yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(org => {
            const linkedCount = contacts.filter(c => c.organisationId === org.id).length
            return (
              <div
                key={org.id}
                className="p-4 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)] hover:bg-[#1A1A1A] transition-all cursor-pointer"
                onClick={() => setEditing(org)}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-semibold text-[#F5F5F5] leading-snug">{org.name}</p>
                  {org.pipelineStage && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0] ml-2 shrink-0">{org.pipelineStage}</span>
                  )}
                </div>
                {org.industry && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] text-[#6B7280] mb-2">{org.industry}</span>
                )}
                <div className="space-y-1">
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#A0A0A0] transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {org.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {org.size && (
                    <p className="text-xs text-[#6B7280]">{org.size} employees</p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)]">
                  <span className="text-xs text-[#4B5563]">{linkedCount} contact{linkedCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <OrgDialog
          mode="create"
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onSave={onAdd}
        />
      )}
      {editing && (
        <OrgDialog
          mode="edit"
          org={editing}
          workspaceId={workspaceId}
          onClose={() => setEditing(null)}
          onSave={onUpdate}
        />
      )}
    </>
  )
}

// ─── PipelineTab ───────────────────────────────────────────────────────────
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
  const today = new Date().toISOString().split('T')[0]

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
                    style={snapshot.isDraggingOver
                      ? { border: `1px solid ${workspaceColor}40` }
                      : { border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {stageContacts.map((contact, index) => {
                      const isPast = contact.nextReachDate && contact.nextReachDate < today

                      return (
                        <Draggable key={contact.id} draggableId={contact.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'p-3 mb-2 last:mb-0 rounded-[6px] bg-[#141414] border cursor-grab active:cursor-grabbing transition-all',
                                snapshot.isDragging
                                  ? 'border-[rgba(255,255,255,0.16)]'
                                  : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.10)]'
                              )}
                            >
                              <p className="text-sm font-medium text-[#F5F5F5] mb-0.5">{contact.name}</p>
                              {contact.company && (
                                <p className="text-xs text-[#6B7280]">{contact.company}</p>
                              )}
                              {contact.nextReachDate && (
                                <p className={cn('text-xs mt-1', isPast ? 'text-red-400' : 'text-amber-400')}>
                                  Follow up: {contact.nextReachDate}
                                </p>
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
                      )
                    })}
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
