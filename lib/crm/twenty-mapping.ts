/**
 * Cockpit ⇄ Twenty CRM field mapping (task c68df6e1).
 *
 * Pure, dependency-free translation between a Twenty `person` record (REST shape,
 * v2.20.0) and a Cockpit `contacts` row. Both the Vercel webhook receiver and the
 * Mini reconcile/outbound worker import this so the two directions can never drift.
 *
 * Twenty quirks baked in here (see ~/workspaces/dev/crm/INFRA.md):
 *  - `emails`/`phones`/`linkedinLink` are composite objects, not scalars.
 *  - Twenty stores a phone as callingCode ("+61") + national number ("427…"); we
 *    reconstruct E.164 inbound and hand Twenty a raw "+…" string outbound (it parses).
 *  - Only international (+CC) phones are accepted — national-format numbers are dropped.
 *  - person has NO `city` field; company is a relation (`companyId`).
 *  - `pipelineStage`/`nextReachDate`/`source`/`vcardUid` are custom fields on person.
 */

/** Twenty OM workspace (INFRA.md — the only provisioned workspace so far). */
export const TWENTY_OM_WORKSPACE_ID = '187b72b7-c495-4c27-b159-e49c40aeceeb'

/**
 * Which Cockpit workspace a Twenty workspace maps to. The OM CRM pilot lands in
 * Cockpit's `personal` workspace; BF/KORUS get their own Twenty stacks later
 * (INFRA.md), so this stays a lookup rather than a constant.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cockpitWorkspaceForTwenty(twentyWorkspaceId?: string | null): string {
  return 'personal'
}

// ---- Twenty person REST shape (only the fields we read) -------------------

export interface TwentyPerson {
  id: string
  name?: { firstName?: string | null; lastName?: string | null } | null
  emails?: { primaryEmail?: string | null; additionalEmails?: unknown } | null
  phones?: {
    primaryPhoneNumber?: string | null
    primaryPhoneCallingCode?: string | null
    primaryPhoneCountryCode?: string | null
    additionalPhones?: unknown
  } | null
  jobTitle?: string | null
  linkedinLink?: { primaryLinkUrl?: string | null } | null
  company?: { name?: string | null } | null
  companyId?: string | null
  vcardUid?: string | null
  pipelineStage?: string | null
  nextReachDate?: string | null
  source?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  deletedAt?: string | null
}

/** The Cockpit-contact fields this sync owns — the comparison + write surface. */
export interface ContactSyncFields {
  name: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  role: string | null
  company: string | null
  linkedinUrl: string | null
  pipelineStage: string | null
  nextReachDate: string | null
  source: string | null
  vcardUid: string | null
}

/** Minimal contact shape the outbound direction reads (subset of the row). */
export interface ContactLike {
  name: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  role?: string | null
  linkedinUrl?: string | null
  pipelineStage?: string | null
  nextReachDate?: string | null
  source?: string | null
  vcardUid?: string | null
}

// ---- helpers --------------------------------------------------------------

const digits = (v: unknown): string => String(v ?? '').replace(/\D/g, '')
const trimOrNull = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length ? s : null
}

/** A DATE field can arrive as "2026-07-14" or an ISO datetime; keep the day. */
export function normalizeDate(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** True only for an E.164-ish "+CC…" number Twenty will accept. */
export function isE164(v: unknown): boolean {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s.startsWith('+')) return false
  const d = digits(s)
  return d.length >= 7 && d.length <= 15 && d[0] !== '0'
}

/** Reconstruct a display E.164 from Twenty's split callingCode + national number. */
export function e164FromTwenty(phones: TwentyPerson['phones']): string | null {
  const p = phones ?? {}
  const rawNum = (p.primaryPhoneNumber ?? '').trim()
  if (!rawNum) return null
  if (rawNum.startsWith('+')) return '+' + digits(rawNum)
  const cc = digits(p.primaryPhoneCallingCode)
  const num = digits(rawNum)
  if (!num) return null
  return cc ? `+${cc}${num}` : `+${num}`
}

/** First value that is a Twenty-acceptable +CC phone, else null. */
export function pickE164(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    if (c && isE164(c)) return c.trim()
  }
  return null
}

/** Tolerant phone equality across Twenty's split form and a raw E.164 string. */
export function phonesEqual(twentyPhones: TwentyPerson['phones'], raw: string | null): boolean {
  const stored = e164FromTwenty(twentyPhones)
  const want = raw && isE164(raw) ? '+' + digits(raw) : null
  return (stored ?? null) === want
}

// ---- Twenty person → Cockpit contact --------------------------------------

export function personToContact(p: TwentyPerson): ContactSyncFields {
  const first = trimOrNull(p.name?.firstName)
  const last = trimOrNull(p.name?.lastName)
  const email = trimOrNull(p.emails?.primaryEmail)
  const name = [first, last].filter(Boolean).join(' ').trim() || email || 'Unnamed contact'
  return {
    name,
    firstName: first,
    lastName: last,
    email,
    phone: e164FromTwenty(p.phones),
    role: trimOrNull(p.jobTitle),
    company: trimOrNull(p.company?.name),
    linkedinUrl: trimOrNull(p.linkedinLink?.primaryLinkUrl),
    pipelineStage: trimOrNull(p.pipelineStage),
    nextReachDate: normalizeDate(p.nextReachDate),
    source: trimOrNull(p.source),
    vcardUid: trimOrNull(p.vcardUid),
  }
}

/**
 * True if the existing Cockpit contact differs from the mapped Twenty fields on
 * any sync-owned column. Loop-breaker: an echo produces no diff → no write.
 * `company` is compared only when Twenty actually carries a company name (the
 * webhook payload often omits the relation), so we never blank a Cockpit value.
 */
export function contactNeedsUpdate(
  existing: Partial<ContactSyncFields> & Record<string, unknown>,
  mapped: ContactSyncFields,
): boolean {
  const cmp: Array<keyof ContactSyncFields> = [
    'name', 'firstName', 'lastName', 'email', 'phone',
    'role', 'linkedinUrl', 'pipelineStage', 'nextReachDate', 'source', 'vcardUid',
  ]
  for (const k of cmp) {
    const a = (existing[k] ?? null) as string | null
    const b = mapped[k]
    if ((a ?? null) !== (b ?? null)) return true
  }
  if (mapped.company != null && (existing.company ?? null) !== mapped.company) return true
  return false
}

// ---- Cockpit contact → Twenty person (REST write payload) -----------------

export function contactToPerson(c: ContactLike): Record<string, unknown> {
  let first = c.firstName?.trim() || ''
  let last = c.lastName?.trim() || ''
  if (!first && !last && c.name) {
    const parts = c.name.trim().split(/\s+/)
    first = parts.shift() ?? ''
    last = parts.join(' ')
  }
  const phone = pickE164(c.mobile, c.phone)
  const payload: Record<string, unknown> = {
    name: { firstName: first, lastName: last },
    emails: { primaryEmail: c.email?.trim() || '' },
    phones: { primaryPhoneNumber: phone ?? '' },
    jobTitle: c.role?.trim() || '',
    linkedinLink: { primaryLinkUrl: c.linkedinUrl?.trim() || '' },
  }
  // Custom fields — only send when Cockpit has a value, so we never clobber a
  // CRM-side edit with an empty string.
  const pipelineStage = trimOrNull(c.pipelineStage)
  if (pipelineStage) payload.pipelineStage = pipelineStage
  const nextReachDate = normalizeDate(c.nextReachDate)
  if (nextReachDate) payload.nextReachDate = nextReachDate
  const source = trimOrNull(c.source)
  if (source) payload.source = source
  const vcardUid = trimOrNull(c.vcardUid)
  if (vcardUid) payload.vcardUid = vcardUid
  return payload
}

/**
 * True if the Twenty person differs from what Cockpit would write — outbound
 * loop-breaker (only PATCH when something actually changed).
 */
export function personNeedsUpdate(existing: TwentyPerson, c: ContactLike): boolean {
  const desired = contactToPerson(c) as {
    name: { firstName: string; lastName: string }
    emails: { primaryEmail: string }
    phones: { primaryPhoneNumber: string }
    jobTitle: string
    linkedinLink: { primaryLinkUrl: string }
    pipelineStage?: string
    nextReachDate?: string
    source?: string
    vcardUid?: string
  }
  if ((existing.name?.firstName ?? '') !== desired.name.firstName) return true
  if ((existing.name?.lastName ?? '') !== desired.name.lastName) return true
  if ((existing.emails?.primaryEmail ?? '').toLowerCase() !== desired.emails.primaryEmail.toLowerCase()) return true
  if (!phonesEqual(existing.phones, desired.phones.primaryPhoneNumber || null)) return true
  if ((existing.jobTitle ?? '') !== desired.jobTitle) return true
  const haveLi = (existing.linkedinLink?.primaryLinkUrl ?? '').replace(/\/+$/, '')
  if (haveLi !== desired.linkedinLink.primaryLinkUrl.replace(/\/+$/, '')) return true
  if (desired.pipelineStage != null && (existing.pipelineStage ?? '') !== desired.pipelineStage) return true
  if (desired.nextReachDate != null && normalizeDate(existing.nextReachDate) !== desired.nextReachDate) return true
  if (desired.source != null && (existing.source ?? '') !== desired.source) return true
  if (desired.vcardUid != null && (existing.vcardUid ?? '') !== desired.vcardUid) return true
  return false
}
