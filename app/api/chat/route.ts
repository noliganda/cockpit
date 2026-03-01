import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL ?? 'ws://localhost:18789'

  return NextResponse.json({
    gatewayUrl: gatewayUrl.replace('ws://', 'http://').replace('wss://', 'https://'),
    token: process.env.OPENCLAW_GATEWAY_TOKEN,
  })
}
