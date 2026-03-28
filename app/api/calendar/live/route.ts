/**
 * Live calendar feed — fetches Google Calendar events on demand (no DB storage)
 * Uses charlie@byronfilm.com OAuth token to access all shared calendars
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// Calendars to fetch with their workspace colour hints
const CALENDARS = [
  { id: 'olivier@byronfilm.com', label: 'Byron Film', workspace: 'byron-film' },
  { id: 'hey@oliviermarcolin.com', label: 'Olivier Marcolin', workspace: 'personal' },
  // charlie@byronfilm.com primary is work calendar (same workspace as byron-film)
  { id: 'primary', label: 'Charlie (Work)', workspace: 'byron-film' },
]

interface GCalEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  htmlLink?: string
  status?: string
}

interface GCalListResponse {
  items?: GCalEvent[]
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(`Token refresh failed: ${data.error ?? 'unknown'}`)
  return data.access_token
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json() as GCalListResponse
  return data.items ?? []
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.GOOGLE_REFRESH_TOKEN || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Google Calendar not configured', events: [] }, { status: 422 })
    }

    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('days') ?? '30', 10)

    const now = new Date()
    const end = new Date(now)
    end.setDate(now.getDate() + daysAhead)
    const timeMin = now.toISOString()
    const timeMax = end.toISOString()

    const accessToken = await getAccessToken()

    const results = await Promise.allSettled(
      CALENDARS.map(async cal => {
        const events = await fetchCalendarEvents(accessToken, cal.id, timeMin, timeMax)
        return events
          .filter(e => e.status !== 'cancelled')
          .map(e => ({
            id: `${cal.id}::${e.id}`,
            calendarId: cal.id,
            calendarLabel: cal.label,
            workspace: cal.workspace,
            title: e.summary ?? '(No title)',
            description: e.description ?? null,
            location: e.location ?? null,
            allDay: !e.start.dateTime,
            startTime: e.start.dateTime ?? `${e.start.date}T00:00:00`,
            endTime: e.end.dateTime ?? `${e.end.date}T23:59:59`,
            url: e.htmlLink ?? null,
          }))
      })
    )

    const allEvents = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    const errors = results
      .map((r, i) => r.status === 'rejected' ? `${CALENDARS[i].label}: ${(r.reason as Error).message}` : null)
      .filter(Boolean)

    // Sort by start time, deduplicate by id
    const seen = new Set<string>()
    const sorted = allEvents
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    return NextResponse.json({
      events: sorted,
      count: sorted.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[GET /api/calendar/live]', error)
    return NextResponse.json({ error: 'Calendar fetch failed', events: [] }, { status: 500 })
  }
}
