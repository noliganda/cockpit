'use client'
import { useState, useMemo } from 'react'
import { User, X, Search, Linkedin, Instagram, Globe, Download } from 'lucide-react'
import { CustomCheckbox } from '@/components/custom-checkbox'
import { cn } from '@/lib/utils'
import type { Contact, WorkspaceId } from '@/types'
import { useWorkspace } from '@/hooks/use-workspace'
import { toast } from 'sonner'

// The Rolodex is a READ-ONLY view of contacts synced in from Twenty
// (Baïkal → Twenty → Cockpit). Person fields are never editable here; only the two
// Cockpit-local fields — notes and tags — can be edited (they never sync back).

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

// ─── Local badge (rows with no Twenty link) ────────────────────────────────
function LocalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center text-[10px] font-mono uppercase tracking-wide text-[#7A6F55] border border-[rgba(167,155,120,0.22)] px-1 py-px', className)}
      title="Local contact — created in Cockpit, not linked to Twenty"
    >
      local
    </span>
  )
}

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
        {value.length === 0 && <span className="text-xs text-[#5C5340]">No tags</span>}
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

// ─── Contact Panel (read-only person fields + editable notes/tags) ─────────
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-xs text-[#7A6F55] uppercase tracking-wide w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#E8DFCE] break-words min-w-0">{value}</span>
    </div>
  )
}

function ContactPanel({
  contact,
  onClose,
  onSave,
}: {
  contact: Contact
  onClose: () => void
  onSave: (c: Contact) => void
}) {
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [tags, setTags] = useState<string[]>(contact.tags ?? [])
  const [saving, setSaving] = useState(false)
  const isLocal = !contact.twentyPersonId

  const dirty = notes !== (contact.notes ?? '') ||
    JSON.stringify(tags) !== JSON.stringify(contact.tags ?? [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, tags }),
      })
      if (!res.ok) throw new Error('Failed')
      const saved = await res.json() as Contact
      onSave(saved)
      toast.success('Saved')
      onClose()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const fields: [string, string | null | undefined][] = [
    ['Position', contact.role],
    ['Company', contact.company],
    ['Email', contact.email],
    ['Mobile', contact.mobile],
    ['Phone', contact.phone],
    ['Address', contact.address],
    ['Source', contact.source],
    ['Next reach', contact.nextReachDate],
  ]
  const shownFields = fields.filter(([, v]) => v) as [string, string][]

  const links: [string, string][] = [
    contact.linkedinUrl ? ['LinkedIn', contact.linkedinUrl] : null,
    contact.instagramUrl ? ['Instagram', contact.instagramUrl] : null,
    contact.facebookUrl ? ['Facebook', contact.facebookUrl] : null,
    contact.portfolioUrl ? ['Portfolio', contact.portfolioUrl] : null,
    contact.website ? ['Website', contact.website] : null,
  ].filter(Boolean) as [string, string][]

  return (
    <DialogOverlay onClose={onClose}>
      <div className="relative w-full sm:max-w-lg bg-[#201A14] border border-[rgba(167,155,120,0.22)] sm:rounded-none rounded-t-[16px] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[rgba(167,155,120,0.13)] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#E8DFCE] truncate">{contact.name}</h2>
              {isLocal && <LocalBadge />}
            </div>
            <p className="text-[11px] text-[#5C5340] font-mono mt-0.5">
              {isLocal ? 'Local · not synced to Twenty' : 'Synced from Twenty · read-only'}
            </p>
          </div>
          <button onClick={onClose} className="text-[#7A6F55] hover:text-[#E8DFCE] transition-colors shrink-0 ml-3"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Read-only person fields */}
          {shownFields.length > 0 && (
            <div className="space-y-3">
              {shownFields.map(([label, value]) => (
                <ReadOnlyRow key={label} label={label} value={value} />
              ))}
            </div>
          )}

          {/* Links */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {links.map(([label, url]) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">
                  {label === 'LinkedIn' ? <Linkedin className="w-3.5 h-3.5" /> : label === 'Instagram' ? <Instagram className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  {label}
                </a>
              ))}
            </div>
          )}

          {/* Editable: Tags */}
          <div>
            <label className={labelCls}>Tags <span className="normal-case text-[#5C5340]">(editable)</span></label>
            <TagsInput value={tags} onChange={setTags} />
          </div>

          {/* Editable: Notes */}
          <div>
            <label className={labelCls}>Notes <span className="normal-case text-[#5C5340]">(editable)</span></label>
            <textarea
              className={cn(inputCls, 'resize-none h-28')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Cockpit-local notes — never synced back to Twenty…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[rgba(167,155,120,0.13)] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#7A6F55] hover:text-[#E8DFCE] transition-colors">Close</button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-2 rounded-none bg-[#E8DFCE] text-[#14100C] text-sm font-medium hover:bg-[#E8DFCE] transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Notes & Tags'}
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

export function ContactsClient({ contacts: initialContacts }: ContactsClientProps) {
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
          onUpdate={c => setContacts(prev => prev.map(x => x.id === c.id ? c : x))}
        />
      </div>
    </div>
  )
}

// ─── ContactsTab ───────────────────────────────────────────────────────────
function ContactsTab({
  contacts,
  onUpdate,
}: {
  contacts: Contact[]
  onUpdate: (c: Contact) => void
}) {
  const { workspace } = useWorkspace()
  const accentColor = workspace.color
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<Contact | null>(null)

  // Batch selection — for VCF export only (the Rolodex has no destructive actions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null)

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

  return (
    <>
      {/* Search */}
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
      </div>

      {/* Batch Toolbar — export only */}
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
                    onClick={() => setViewing(contact)}
                  >
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <CustomCheckbox
                        checked={selectedIds.has(contact.id)}
                        onClick={e => toggleSelect(e, idx, contact.id)}
                        accentColor={accentColor}
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-sm text-[#E8DFCE]">{contact.name}</span>
                        {!contact.twentyPersonId && <LocalBadge />}
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
                    className="text-sm font-medium text-[#E8DFCE] flex-1 cursor-pointer inline-flex items-center gap-2"
                    onClick={() => setViewing(contact)}
                  >
                    {contact.name}
                    {!contact.twentyPersonId && <LocalBadge />}
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

      {viewing && (
        <ContactPanel
          contact={viewing}
          onClose={() => setViewing(null)}
          onSave={onUpdate}
        />
      )}
    </>
  )
}
