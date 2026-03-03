import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

type Params = Promise<{ path: string[] }>

async function proxy(request: NextRequest, paramsPromise: Params, method: string) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { path } = await paramsPromise
  const nocoUrl = process.env.NOCODB_URL?.replace(/\/$/, '')
  const token = process.env.NOCODB_API_TOKEN

  if (!nocoUrl || !token) {
    return NextResponse.json({ error: 'NocoDB not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const qs = searchParams.toString()
  const targetUrl = `${nocoUrl}/${path.join('/')}${qs ? `?${qs}` : ''}`

  let body: string | undefined
  if (method !== 'GET' && method !== 'DELETE') {
    body = await request.text()
  }

  try {
    const res = await fetch(targetUrl, {
      method,
      headers: {
        'xc-token': token,
        'Content-Type': 'application/json',
      },
      body,
    })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('NocoDB proxy error:', err)
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, params, 'GET')
}
export async function POST(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, params, 'POST')
}
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, params, 'PATCH')
}
export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  return proxy(request, params, 'DELETE')
}
