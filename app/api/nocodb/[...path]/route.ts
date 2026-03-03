// Proxy route — forwards requests to NocoDB, injecting the API token server-side.
// Client calls: /api/nocodb/api/v1/...
// Proxied to:   http://localhost:8080/api/v1/...
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const NOCODB_URL = process.env.NOCODB_URL ?? 'http://localhost:8080'
const NOCODB_API_TOKEN = process.env.NOCODB_API_TOKEN ?? ''

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { path } = await params
  const url = new URL(request.url)
  const targetUrl = `${NOCODB_URL}/${path.join('/')}${url.search}`

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text()

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    })

    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch (err) {
    console.error('[NocoDB proxy] error:', err)
    return NextResponse.json(
      { error: 'NocoDB unavailable', detail: String(err) },
      { status: 503 }
    )
  }
}

export const GET = handler
export const POST = handler
export const PATCH = handler
export const DELETE = handler
export const PUT = handler
