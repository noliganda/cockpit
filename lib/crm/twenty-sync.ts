/**
 * Cockpit ⇄ Twenty CRM sync engine (task c68df6e1).
 *
 * Thin Twenty REST client + the two idempotent, loop-safe sync directions:
 *   inbound  — upsertContactFromTwentyPerson: a Twenty person → a Cockpit contact
 *   outbound — pushContactToTwenty: a Cockpit contact → a Twenty person
 *
 * Both directions diff before they write (see twenty-mapping), so an echo of our
 * own change produces no write and the loop dies on the first bounce. Matching
 * precedence is always twentyPersonId (strong) → vcardUid (Baïkal key) → email.
 *
 * Used by both the Vercel webhook receiver (app/api/crm/webhooks/twenty) and the
 * Mini reconcile/outbound worker (scripts/crm/twenty-worker.ts).
 */
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { logActivity } from '@/lib/activity'
import {
  type TwentyPerson,
  type ContactLike,
  cockpitWorkspaceForTwenty,
  personToContact,
  contactToPerson,
  contactNeedsUpdate,
  personNeedsUpdate,
} from '@/lib/crm/twenty-mapping'

// ---- REST client ----------------------------------------------------------

const DEFAULT_BASE = 'http://127.0.0.1:3001'

export class TwentyClient {
  readonly base: string
  private readonly token: string

  constructor(opts?: { baseUrl?: string; token?: string }) {
    this.base = (opts?.baseUrl ?? process.env.TWENTY_API_URL ?? DEFAULT_BASE).replace(/\/+$/, '')
    const token = opts?.token ?? process.env.TWENTY_OM_API_KEY
    if (!token) throw new Error('TWENTY_OM_API_KEY is not set')
    this.token = token
  }

  private async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    // 429 is raised by Twenty's limiter before any processing, so waiting out the
    // reported window and retrying can never duplicate (self-hosted: 100/1s + 100/60s).
    for (let throttled = 0; ; throttled++) {
      const res = await fetch(this.base + path, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (res.status === 429 && throttled < 60) {
        const detail = await res.text().catch(() => '')
        await sleep(detail.includes('60000 ms') ? 61_000 : 1_200)
        continue
      }
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 500)
        throw new Error(`${method} ${path} → HTTP ${res.status}: ${detail}`)
      }
      return (await res.json()) as T
    }
  }

  /** Twenty single-record responses wrap the object under an operation key. */
  private static one(resp: { data?: Record<string, unknown> } | null): TwentyPerson | null {
    const data = resp?.data
    if (!data) return null
    for (const v of Object.values(data)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as TwentyPerson
    }
    return null
  }

  async getPerson(id: string): Promise<TwentyPerson | null> {
    try {
      return TwentyClient.one(await this.request('GET', `/rest/people/${id}`))
    } catch (err) {
      if (err instanceof Error && /HTTP 404/.test(err.message)) return null
      throw err
    }
  }

  private async findOne(filter: string): Promise<TwentyPerson | null> {
    const resp = await this.request<{ data: { people: TwentyPerson[] } }>(
      'GET',
      `/rest/people?limit=1&filter=${encodeURIComponent(filter)}`,
    )
    return resp.data.people[0] ?? null
  }

  findByVcardUid(uid: string): Promise<TwentyPerson | null> {
    return this.findOne(`vcardUid[eq]:${uid}`)
  }

  findByEmail(email: string): Promise<TwentyPerson | null> {
    return this.findOne(`emails.primaryEmail[eq]:${email}`)
  }

  async createPerson(payload: Record<string, unknown>): Promise<TwentyPerson | null> {
    return TwentyClient.one(await this.request('POST', '/rest/people', payload))
  }

  async updatePerson(id: string, patch: Record<string, unknown>): Promise<TwentyPerson | null> {
    return TwentyClient.one(await this.request('PATCH', `/rest/people/${id}`, patch))
  }

  /**
   * Page through people, newest-updated first, invoking `onPage` per page.
   * If `onPage` returns `false`, paging stops — lets the reconcile worker bail
   * as soon as it walks past its "updated since" cutoff.
   */
  async eachPerson(
    onPage: (people: TwentyPerson[]) => Promise<boolean | void> | boolean | void,
    pageSize = 200,
  ): Promise<void> {
    let cursor: string | null = null
    for (;;) {
      let path = `/rest/people?limit=${pageSize}&order_by=updatedAt[DescNullsLast]`
      if (cursor) path += `&starting_after=${encodeURIComponent(cursor)}`
      const resp = await this.request<{ data: { people: TwentyPerson[] }; pageInfo?: { hasNextPage?: boolean; endCursor?: string } }>('GET', path)
      const cont = await onPage(resp.data.people)
      if (cont === false) return
      const info = resp.pageInfo ?? {}
      if (!info.hasNextPage || !info.endCursor) return
      cursor = info.endCursor
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---- inbound: Twenty person → Cockpit contact -----------------------------

export type InboundAction = 'created' | 'updated' | 'unchanged' | 'detached'

export interface InboundResult {
  action: InboundAction
  contactId: string | null
  personId: string
}

type ContactRow = typeof contacts.$inferSelect

async function findContactForPerson(person: TwentyPerson, workspaceId: string): Promise<ContactRow | null> {
  const byId = await db.select().from(contacts).where(eq(contacts.twentyPersonId, person.id)).limit(1)
  if (byId[0]) return byId[0]

  const uid = person.vcardUid?.trim()
  if (uid) {
    const byUid = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), eq(contacts.vcardUid, uid)))
      .limit(1)
    if (byUid[0]) return byUid[0]
  }

  const email = person.emails?.primaryEmail?.trim()
  if (email) {
    const byEmail = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.workspaceId, workspaceId), sql`lower(${contacts.email}) = lower(${email})`))
      .limit(1)
    if (byEmail[0]) return byEmail[0]
  }
  return null
}

/**
 * Reflect a Twenty person into Cockpit. Matches twentyPersonId → vcardUid → email;
 * inserts if none match. Idempotent: no write when the contact already agrees.
 */
export async function upsertContactFromTwentyPerson(
  person: TwentyPerson,
  opts: { twentyWorkspaceId?: string | null; via?: string } = {},
): Promise<InboundResult> {
  const workspaceId = cockpitWorkspaceForTwenty(opts.twentyWorkspaceId)
  const mapped = personToContact(person)
  const existing = await findContactForPerson(person, workspaceId)
  const now = new Date()

  if (!existing) {
    const [row] = await db
      .insert(contacts)
      .values({
        workspaceId,
        name: mapped.name,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        role: mapped.role,
        company: mapped.company,
        linkedinUrl: mapped.linkedinUrl,
        pipelineStage: mapped.pipelineStage,
        nextReachDate: mapped.nextReachDate,
        source: mapped.source ?? 'twenty',
        vcardUid: mapped.vcardUid,
        twentyPersonId: person.id,
        twentySyncedAt: now,
        updatedAt: now,
      })
      .returning()
    await logCrm(workspaceId, 'contact_synced_in', row.id, row.name, {
      action: 'created', personId: person.id, via: opts.via,
    })
    return { action: 'created', contactId: row.id, personId: person.id }
  }

  // Always reconcile the link + sync timestamp; only rewrite fields on a diff.
  const linkOnly = existing.twentyPersonId !== person.id || existing.vcardUid !== mapped.vcardUid
  if (!contactNeedsUpdate(existing, mapped)) {
    if (linkOnly) {
      await db
        .update(contacts)
        .set({ twentyPersonId: person.id, vcardUid: mapped.vcardUid ?? existing.vcardUid, twentySyncedAt: now })
        .where(eq(contacts.id, existing.id))
    } else {
      await db.update(contacts).set({ twentySyncedAt: now }).where(eq(contacts.id, existing.id))
    }
    return { action: 'unchanged', contactId: existing.id, personId: person.id }
  }

  const [row] = await db
    .update(contacts)
    .set({
      name: mapped.name,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      email: mapped.email,
      phone: mapped.phone,
      role: mapped.role,
      // company is only overwritten when Twenty actually sent one
      ...(mapped.company != null ? { company: mapped.company } : {}),
      linkedinUrl: mapped.linkedinUrl,
      pipelineStage: mapped.pipelineStage,
      nextReachDate: mapped.nextReachDate,
      ...(mapped.source ? { source: mapped.source } : {}),
      vcardUid: mapped.vcardUid ?? existing.vcardUid,
      twentyPersonId: person.id,
      twentySyncedAt: now,
      updatedAt: now,
    })
    .where(eq(contacts.id, existing.id))
    .returning()
  await logCrm(workspaceId, 'contact_synced_in', row.id, row.name, {
    action: 'updated', personId: person.id, via: opts.via,
  })
  return { action: 'updated', contactId: row.id, personId: person.id }
}

/** person.deleted — detach the link (never delete the Cockpit contact). */
export async function detachDeletedPerson(
  personId: string,
  opts: { via?: string } = {},
): Promise<InboundResult> {
  const [row] = await db
    .update(contacts)
    .set({ twentyPersonId: null, twentySyncedAt: new Date() })
    .where(eq(contacts.twentyPersonId, personId))
    .returning()
  if (row) {
    await logCrm(row.workspaceId, 'contact_unlinked', row.id, row.name, { personId, via: opts.via })
    return { action: 'detached', contactId: row.id, personId }
  }
  return { action: 'unchanged', contactId: null, personId }
}

// ---- outbound: Cockpit contact → Twenty person ----------------------------

export type OutboundAction = 'created' | 'updated' | 'unchanged'

export interface OutboundResult {
  action: OutboundAction
  personId: string | null
  contactId: string
}

/**
 * Push a Cockpit contact into Twenty. Resolves the target person by
 * twentyPersonId → vcardUid → email, creating one if none exists. Idempotent:
 * PATCHes only when a field actually differs. Returns the resolved person id so
 * the caller can persist it back onto the contact (breaks the search next time).
 */
export async function pushContactToTwenty(
  client: TwentyClient,
  contact: ContactLike & { id: string; twentyPersonId?: string | null; workspaceId?: string },
): Promise<OutboundResult> {
  const payload = contactToPerson(contact)

  let person: TwentyPerson | null = null
  if (contact.twentyPersonId) person = await client.getPerson(contact.twentyPersonId)
  if (!person && contact.vcardUid) person = await client.findByVcardUid(contact.vcardUid.trim())
  if (!person && contact.email) person = await client.findByEmail(contact.email.trim())

  if (!person) {
    const created = await client.createPerson(payload)
    const personId = created?.id ?? null
    if (personId) {
      await db
        .update(contacts)
        .set({ twentyPersonId: personId, twentySyncedAt: new Date() })
        .where(eq(contacts.id, contact.id))
    }
    await logCrm(contact.workspaceId ?? 'personal', 'contact_synced_out', contact.id, contact.name, {
      action: 'created', personId,
    })
    return { action: 'created', personId, contactId: contact.id }
  }

  if (!personNeedsUpdate(person, contact)) {
    if (contact.twentyPersonId !== person.id) {
      await db
        .update(contacts)
        .set({ twentyPersonId: person.id, twentySyncedAt: new Date() })
        .where(eq(contacts.id, contact.id))
    }
    return { action: 'unchanged', personId: person.id, contactId: contact.id }
  }

  const updated = await client.updatePerson(person.id, payload)
  await db
    .update(contacts)
    .set({ twentyPersonId: person.id, twentySyncedAt: new Date() })
    .where(eq(contacts.id, contact.id))
  await logCrm(contact.workspaceId ?? 'personal', 'contact_synced_out', contact.id, contact.name, {
    action: 'updated', personId: updated?.id ?? person.id,
  })
  return { action: 'updated', personId: updated?.id ?? person.id, contactId: contact.id }
}

/** Contacts changed in Cockpit since their last Twenty sync — the outbound work-list. */
export async function contactsPendingOutbound(workspaceId: string): Promise<ContactRow[]> {
  return db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.workspaceId, workspaceId),
        // never pushed, or edited in Cockpit after the last reconcile
        sql`(${contacts.twentySyncedAt} is null or ${contacts.updatedAt} > ${contacts.twentySyncedAt})`,
        // must have something to match/create on
        sql`(${contacts.twentyPersonId} is not null or ${contacts.email} is not null or ${contacts.vcardUid} is not null)`,
      ),
    )
}

/** Contacts that carry a Twenty link — the inbound reconcile candidate set. */
export async function linkedContacts(workspaceId: string): Promise<ContactRow[]> {
  return db
    .select()
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), isNotNull(contacts.twentyPersonId)))
}

// ---- activity spine -------------------------------------------------------

async function logCrm(
  workspaceId: string,
  eventType: string,
  entityId: string,
  entityTitle: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await logActivity({
    workspaceId,
    action: 'synced',
    entityType: 'contact',
    entityId,
    entityTitle,
    actor: 'system',
    actorType: 'system',
    eventFamily: 'crm',
    eventType,
    sourceSystem: 'twenty',
    status: 'success',
    metadata,
  })
}
