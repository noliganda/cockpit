import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setSessionCookie, clearSession, getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const body = await request.json() as { password?: string; email?: string }

  // Email + password login (new flow)
  if (body.email && body.password) {
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const valid = await verifyPassword(body.password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: (user.role ?? 'admin') as 'admin' | 'collaborator' | 'guest',
    })
    return NextResponse.json({ success: true, role: user.role })
  }

  // Legacy password-only login (backward compat)
  if (body.password) {
    const hash = process.env.AUTH_PASSWORD_HASH
    if (!hash) {
      const bcrypt = await import('bcryptjs')
      const defaultHash = await bcrypt.default.hash('opsdb2026', 12)
      const valid = await verifyPassword(body.password, defaultHash)
      if (valid) {
        await setSessionCookie('authenticated')
        return NextResponse.json({ success: true })
      }
    } else {
      const valid = await verifyPassword(body.password, hash)
      if (valid) {
        await setSessionCookie('authenticated')
        return NextResponse.json({ success: true })
      }
    }
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({ authenticated: true })
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ success: true })
}
