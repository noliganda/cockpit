import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, setGuestSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json() as { password: string }
    const hash = process.env.KORUS_GUEST_PASSWORD_HASH
    if (!hash) {
      if (password === 'korus2026') {
        await setGuestSessionCookie()
        return NextResponse.json({ success: true })
      }
    } else {
      const valid = await verifyPassword(password, hash)
      if (valid) {
        await setGuestSessionCookie()
        return NextResponse.json({ success: true })
      }
    }
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  } catch (error) {
    console.error('[POST /api/auth/guest]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
