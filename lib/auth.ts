import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

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
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

export async function getSessionData(): Promise<SessionData | null> {
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
