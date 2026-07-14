import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { cookies, headers } from 'next/headers'

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

const SESSION_COOKIE = 'ops-session'
const GUEST_COOKIE = 'ops-guest-session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const GUEST_MAX_AGE = 60 * 60 * 24 // 24 hours

export interface SessionData {
  userId: string
  email: string
  role: 'admin' | 'collaborator' | 'guest'
  harnessName?: string
  harnessModel?: string
  harnessSessionId?: string
}

// ── Signed sessions ─────────────────────────────────────────────────────────
// The session cookie is an HMAC-signed `<payload>.<sig>` token, so a client can
// never forge one (previously it was raw JSON — anyone could hand-craft an admin
// session). SESSION_SECRET must be set in every runtime; a missing/invalid
// secret makes every cookie fail verification (fail closed).
function sessionSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET is not set')
  return s
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

function signToken(value: string): string {
  const payload = Buffer.from(value, 'utf8').toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

/** Verify an HMAC token and return its decoded string value, or null if invalid. */
function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  let expected: string
  try {
    expected = signPayload(payload)
  } catch {
    return null // no secret configured → fail closed
  }
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    return Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

function verifySessionData(token: string | undefined | null): SessionData | null {
  const raw = verifyToken(token)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as SessionData
    if (data && data.userId && data.email && data.role) return data
    return null
  } catch {
    return null
  }
}

export async function setSessionCookie(data: SessionData) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, signToken(JSON.stringify(data)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function getSession(): Promise<string | null> {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return 'api-authenticated'
    }
  } catch {
    // headers() might throw in some static environments, ignore
  }

  const cookieStore = await cookies()
  return verifySessionData(cookieStore.get(SESSION_COOKIE)?.value) ? 'authenticated' : null
}

export async function getSessionData(): Promise<SessionData | null> {
  // 1. Check for Bearer token in Authorization header (API / Harness requests)
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
        const harnessName = headersList.get('x-harness-name') ?? undefined
        const harnessModel = headersList.get('x-harness-model') ?? undefined
        const harnessSessionId = headersList.get('x-harness-session-id') ?? undefined

        return {
          userId: harnessName ? harnessName.toLowerCase().replace(/\s+/g, '-') : 'api-client',
          email: harnessName ? `${harnessName.toLowerCase()}@local` : 'api@local',
          role: 'admin',
          harnessName,
          harnessModel,
          harnessSessionId,
        }
      }
    }
  } catch {
    // headers() might throw in some static environments, ignore
  }

  // 2. Fallback to cookie-based session (browser dashboard requests).
  // Only a validly HMAC-signed cookie is trusted — no legacy string/admin fallback.
  const cookieStore = await cookies()
  return verifySessionData(cookieStore.get(SESSION_COOKIE)?.value)
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function setGuestSessionCookie(value: string = 'guest') {
  const cookieStore = await cookies()
  cookieStore.set(GUEST_COOKIE, signToken(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GUEST_MAX_AGE,
    path: '/metrics/korus',
  })
}

export async function getGuestSession(): Promise<string | null> {
  const cookieStore = await cookies()
  return verifyToken(cookieStore.get(GUEST_COOKIE)?.value)
}
