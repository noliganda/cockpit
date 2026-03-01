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

export async function setSessionCookie(value: string = 'authenticated') {
  const cookieStore = await cookies()
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
