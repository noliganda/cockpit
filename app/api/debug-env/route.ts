import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const nocoUrl = process.env.NOCODB_URL
  const nocoToken = process.env.NOCODB_API_TOKEN
  
  let fetchResult = 'not attempted'
  if (nocoUrl && nocoToken) {
    try {
      const res = await fetch(nocoUrl + '/api/v1/health', {
        headers: { 'xc-token': nocoToken },
        cache: 'no-store',
      })
      fetchResult = `${res.status} ${await res.text()}`
    } catch (err) {
      fetchResult = `ERROR: ${String(err)}`
    }
  }
  
  return NextResponse.json({
    NOCODB_URL: nocoUrl ? `set (${nocoUrl.substring(0, 30)}...)` : 'MISSING',
    NOCODB_API_TOKEN: nocoToken ? `set (${nocoToken.length} chars)` : 'MISSING',
    DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING',
    AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH ? 'set' : 'MISSING',
    fetchResult,
  })
}
