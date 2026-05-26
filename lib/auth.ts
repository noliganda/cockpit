import bcrypt from 'bcryptjs'
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

export async function setSessionCookie(data: SessionData | string = 'authenticated') {
  const cookieStore = await cookies()
  const value = typeof data === 'string' ? data : JSON.stringify(data)
  cookieStore.set(SESSION_COOKIE, value, {
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
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
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

  // 2. Fallback to cookie-based session (browser dashboard requests)
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SessionData
    if (parsed.userId && parsed.email && parsed.role) return parsed
    return null
  } catch {
    // Legacy plain-string session — treat as admin for backward compat
    return { userId: 'legacy', email: 'admin@local', role: 'admin' }
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function setGuestSessionCookie(value: string = 'guest') {
  const cookieStore = await cookies()
  cookieStore.set(GUEST_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GUEST_MAX_AGE,
    path: '/metrics/korus',
  })
}

export async function getGuestSession(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(GUEST_COOKIE)?.value ?? null
}
