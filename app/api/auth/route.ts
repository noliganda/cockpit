import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setSessionCookie, clearSession, getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json() as { password: string }

  const hash = process.env.AUTH_PASSWORD_HASH
  if (!hash) {
    const bcrypt = await import('bcryptjs')
    const defaultHash = await bcrypt.default.hash('opsdb2026', 12)
    const valid = await verifyPassword(password, defaultHash)
    if (valid) {
      await setSessionCookie()
      return NextResponse.json({ success: true })
    }
  } else {
    const valid = await verifyPassword(password, hash)
    if (valid) {
      await setSessionCookie()
      return NextResponse.json({ success: true })
    }
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
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
