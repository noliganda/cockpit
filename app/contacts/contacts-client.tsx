'use client'
import { useState, useMemo } from 'react'
import { User, Plus, X, Search, Linkedin, Instagram, Globe, Download, Trash2 } from 'lucide-react'
import { CustomCheckbox } from '@/components/custom-checkbox'
import { cn } from '@/lib/utils'
import type { Contact, WorkspaceId } from '@/types'
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

// ─── Shared Input Styles ───────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2.5 rounded-none bg-[#0F0C09] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none focus:border-[rgba(167,155,120,0.35)]'
const labelCls = 'block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5'

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
          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(167,155,120,0.18)] text-[#A79B78]">
            {tag}
            <button onClick={() => onChange(value.filter(t => t !== tag))} className="hover:text-[#E8DFCE]"><X className="w-2.5 h-2.5" /></button>
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
        <button onClick={add} className="px-3 rounded-none bg-[rgba(167,155,120,0.13)] text-[#A79B78] hover:bg-[rgba(167,155,120,0.22)] text-sm">+</button>
      </div>
    </div>
  )
}

// ─── Dialog Overlay ────────────────────────────────────────────────────────
function DialogOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-[rgba(10,8,6,0.7)]" onClick={onClose} />
      {children}
    </div>
  )
}

// ─── Contact Form State ────────────────────────────────────────────────────
type ContactForm = {
  firstName: string
  lastName: string
  role: string
  mobile: string
  email: string
  address: string
  linkedinUrl: string
  instagramUrl: string
  facebookUrl: string
  portfolioUrl: string
  tags: string[]
  nextReachDate: string
  notes: string
}

const emptyContactForm = (): ContactForm => ({
  firstName: '',
  lastName: '',
  role: '',
  mobile: '',
  email: '',
  address: '',
  linkedinUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  portfolioUrl: '',
  tags: [],
  nextReachDate: '',
  notes: '',
})

function contactToForm(c: Contact): ContactForm {
  return {
    firstName: c.firstName ?? '',
    lastName: c.lastName ?? '',
    role: c.role ?? '',
    mobile: c.mobile ?? '',
    email: c.email ?? '',
    address: c.address ?? '',
    linkedinUrl: c.linkedinUrl ?? '',
    instagramUrl: c.instagramUrl ?? '',
    facebookUrl: c.facebookUrl ?? '',
    portfolioUrl: c.portfolioUrl ?? '',
    tags: c.tags ?? [],
    nextReachDate: c.nextReachDate ?? '',
    notes: c.notes ?? '',
  }
}

// ─── Contact Dialog ────────────────────────────────────────────────────────
function ContactDialog({
  mode,
  contact,
  workspaceId,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  contact?: Contact
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
      <div className="relative w-full sm:max-w-2xl bg-[#201A14] border border-[rgba(167,155,120,0.22)] sm:rounded-none rounded-t-[16px] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(167,155,120,0.13)] shrink-0">
          <h2 className="text-sm font-semibold text-[#E8DFCE]">{mode === 'create' ? 'New Contact' : 'Edit Contact'}</h2>
          <button onClick={onClose} className="text-[#7A6F55] hover:text-[#E8DFCE] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Row 1: First / Last Name */}
            <div>
              <label className={labelCls}>First Name</label>
              <input className={inputCls} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <input className={inputCls} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Last name" />
            </div>
            {/* Row 2: Position / Mobile */}
            <div>
              <label className={labelCls}>Position / Title</label>
              <input className={inputCls} value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Director" />
            </div>
            <div>
              <label className={labelCls}>Mobile</label>
              <input className={inputCls} type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+61 4xx xxx xxx" />
            </div>
            {/* Row 3: Email / LinkedIn */}
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <label className={labelCls}>LinkedIn URL</label>
              <input className={inputCls} value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
            </div>
            {/* Row 4: Address (full width) */}
            <div className="col-span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" />
            </div>
            {/* Row 5: Instagram / Facebook */}
            <div>
              <label className={labelCls}>Instagram URL</label>
              <input className={inputCls} value={form.instagramUrl} onChange={e => set('instagramUrl', e.target.value)} placeholder="https://instagram.com/…" />
            </div>
            <div>
              <label className={labelCls}>Facebook URL</label>
              <input className={inputCls} value={form.facebookUrl} onChange={e => set('facebookUrl', e.target.value)} placeholder="https://facebook.com/…" />
            </div>
            {/* Row 6: Portfolio / Next Reach Date */}
            <div>
              <label className={labelCls}>Portfolio / Website URL</label>
              <input className={inputCls} value={form.portfolioUrl} onChange={e => set('portfolioUrl', e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className={labelCls}>Next Reach Date</label>
              <input className={inputCls} type="date" value={form.nextReachDate} onChange={e => set('nextReachDate', e.target.value)} />
            </div>
            {/* Row 7: Tags (full width) */}
            <div className="col-span-2">
              <label className={labelCls}>Tags</label>
              <TagsInput value={form.tags} onChange={v => setForm(prev => ({ ...prev, tags: v }))} />
            </div>
            {/* Row 8: Notes (full width) */}
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
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[rgba(167,155,120,0.13)] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-none bg-[#E8DFCE] text-[#14100C] text-sm font-medium hover:bg-[#E8DFCE] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create Contact' : 'Save Changes'}
          </button>
        </div>
      </div>
    </DialogOverlay>
  )
}

// ─── Contacts Client ───────────────────────────────────────────────────────
interface ContactsClientProps {
  contacts: Contact[]
  workspaceId: WorkspaceId
}

export function ContactsClient({ contacts: initialContacts, workspaceId }: ContactsClientProps) {
  const [contacts, setContacts] = useState(initialContacts)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 flex items-center justify-between">
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Contacts</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7A6F55] font-mono">{contacts.length} contacts</span>
          <button
            onClick={() => downloadVCF(contacts)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#201A14] border border-[rgba(167,155,120,0.13)] text-[#A79B78] rounded-none hover:text-[#E8DFCE] hover:bg-[#272018] transition-colors"
            title="Export all contacts as VCF"
          >
            <Download className="w-3.5 h-3.5" />
            Export All
          </button>
        </div>
      </div>

      {/* Directory */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <ContactsTab
          contacts={contacts}
          workspaceId={workspaceId}
          onAdd={c => setContacts(prev => [c, ...prev])}
          onUpdate={c => setContacts(prev => prev.map(x => x.id === c.id ? c : x))}
          onDelete={ids => setContacts(prev => prev.filter(x => !ids.includes(x.id)))}
        />
      </div>
    </div>
  )
}

// ─── ContactsTab ───────────────────────────────────────────────────────────
function ContactsTab({
  contacts,
  workspaceId,
  onAdd,
  onUpdate,
  onDelete,
}: {
  contacts: Contact[]
  workspaceId: WorkspaceId
  onAdd: (c: Contact) => void
  onUpdate: (c: Contact) => void
  onDelete?: (ids: string[]) => void
}) {
  const { workspace } = useWorkspace()
  const accentColor = workspace.color
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5C5340]" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] text-sm text-[#E8DFCE] outline-none focus:border-[rgba(167,155,120,0.35)] placeholder:text-[#5C5340]"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-none bg-[#E8DFCE] text-[#14100C] text-sm font-medium hover:bg-[#E8DFCE] transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> New Contact
        </button>
      </div>

      {/* Batch Toolbar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-none bg-[#201A14] border border-[rgba(167,155,120,0.22)]">
          <span className="text-xs text-[#A79B78] font-medium mr-1">{selectedCount} selected</span>

          {/* Export VCF */}
          <button
            onClick={() => {
              const selected = contacts.filter(c => selectedIds.has(c.id))
              downloadVCF(selected)
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-none bg-[#272018] border border-[rgba(167,155,120,0.18)] text-[#A79B78] hover:text-[#E8DFCE] transition-colors"
          >
            <Download className="w-3 h-3" /> Export VCF
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-none bg-[#272018] border border-[rgba(167,155,120,0.18)] text-[#C0452E] hover:bg-[rgba(192,69,46,0.10)] transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>

          {/* Deselect All */}
          <button
            onClick={() => { setSelectedIds(new Set()); setLastClickedIdx(null) }}
            className="ml-auto flex items-center p-1 text-xs text-[#7A6F55] hover:text-[#E8DFCE] transition-colors"
            title="Deselect all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <User className="w-8 h-8 text-[#5C5340] mx-auto mb-3" />
          <p className="text-sm text-[#5C5340]">{search ? 'No contacts match your search' : 'No contacts yet'}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(167,155,120,0.13)]">
                  <th className="px-3 py-3 w-8">
                    <CustomCheckbox
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      accentColor={accentColor}
                    />
                  </th>
                  {['Name', 'Position', 'Mobile', 'Email', 'Links'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact, idx) => (
                  <tr
                    key={contact.id}
                    className={cn(
                      'border-b border-[rgba(167,155,120,0.09)] last:border-0 hover:bg-[rgba(167,155,120,0.04)] cursor-pointer',
                      selectedIds.has(contact.id) && 'bg-[rgba(167,155,120,0.07)]'
                    )}
                    onClick={() => setEditing(contact)}
                  >
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <CustomCheckbox
                        checked={selectedIds.has(contact.id)}
                        onClick={e => toggleSelect(e, idx, contact.id)}
                        accentColor={accentColor}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-[#E8DFCE] hover:text-[#E8DFCE] transition-colors">
                        {contact.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-[#A79B78]">{contact.role ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {contact.mobile ? (
                        <a href={`tel:${contact.mobile}`} className="text-sm text-[#A79B78] hover:text-[#E8DFCE]" onClick={e => e.stopPropagation()}>
                          {contact.mobile}
                        </a>
                      ) : <span className="text-sm text-[#5C5340]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="text-sm text-[#A79B78] hover:text-[#E8DFCE]" onClick={e => e.stopPropagation()}>
                          {contact.email}
                        </a>
                      ) : <span className="text-sm text-[#5C5340]">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {contact.portfolioUrl && (
                          <a href={contact.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[#5C5340] hover:text-[#A79B78] transition-colors">
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {contact.linkedinUrl && (
                          <a href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#5C5340] hover:text-[#A79B78] transition-colors">
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {contact.instagramUrl && (
                          <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#5C5340] hover:text-[#A79B78] transition-colors">
                            <Instagram className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!contact.portfolioUrl && !contact.linkedinUrl && !contact.instagramUrl && (
                          <span className="text-sm text-[#5C5340]">—</span>
                        )}
                      </div>
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
                  'rounded-none bg-[#1A1510] border border-[rgba(167,155,120,0.13)] p-4 hover:border-[rgba(167,155,120,0.22)]',
                  selectedIds.has(contact.id) && 'border-[rgba(167,155,120,0.22)] bg-[#201A14]'
                )}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="pt-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                    <CustomCheckbox
                      checked={selectedIds.has(contact.id)}
                      onClick={e => toggleSelect(e, idx, contact.id)}
                      accentColor={accentColor}
                    />
                  </div>
                  <p
                    className="text-sm font-medium text-[#E8DFCE] flex-1 cursor-pointer"
                    onClick={() => setEditing(contact)}
                  >
                    {contact.name}
                  </p>
                </div>
                {contact.role && <p className="text-xs text-[#7A6F55] mb-1 ml-5">{contact.role}</p>}
                {contact.email && <p className="text-xs text-[#A79B78] ml-5">{contact.email}</p>}
                {contact.mobile && <p className="text-xs text-[#A79B78] mt-0.5 ml-5">{contact.mobile}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgba(10,8,6,0.7)]" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-[#201A14] border border-[rgba(167,155,120,0.22)] rounded-none p-6 max-w-sm w-full">
            <h2 className="text-sm font-semibold text-[#E8DFCE] mb-2">Delete {selectedCount} contact{selectedCount !== 1 ? 's' : ''}?</h2>
            <p className="text-xs text-[#7A6F55] mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">Cancel</button>
              <button onClick={() => void batchDelete()} className="px-4 py-2 text-sm font-medium bg-[#C0452E] text-[#E8DFCE] rounded-none hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <ContactDialog
          mode="create"
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onSave={onAdd}
        />
      )}
      {editing && (
        <ContactDialog
          mode="edit"
          contact={editing}
          workspaceId={workspaceId}
          onClose={() => setEditing(null)}
          onSave={onUpdate}
        />
      )}
    </>
  )
}
