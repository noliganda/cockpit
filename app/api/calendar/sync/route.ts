import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { db } from '@/lib/db'
import { calendarEvents } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'

const execAsync = promisify(exec)

// Calendar ID → workspace mapping
const CALENDAR_MAP: Record<string, string> = {
  'olivier@byronfilm.com': 'byron-film',
  'charlie@byronfilm.com': 'byron-film',
  'hey@oliviermarcolin.com': 'personal',
}

interface GogEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  htmlLink?: string
}

async function fetchFromGog(calendarId: string, daysAhead = 30): Promise<GogEvent[]> {
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0]
  const { stdout } = await execAsync(
    `GOG_ACCOUNT=charlie@byronfilm.com gog calendar events ${calendarId} --from ${from} --to ${to} --json`,
    { timeout: 30000 }
  )
  return JSON.parse(stdout) as GogEvent[]
}

function parseEventRow(event: GogEvent, calendarId: string) {
  const allDay = !event.start?.dateTime
  const startTime = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : new Date(`${event.start?.date}T00:00:00`)
  const endTime = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : new Date(`${event.end?.date}T23:59:59`)

  return {
    id: `${calendarId}::${event.id}`,
    workspaceId: CALENDAR_MAP[calendarId] ?? 'personal',
    calendarId,
    title: event.summary ?? '(No title)',
    description: event.description ?? null,
    location: event.location ?? null,
    startTime,
    endTime,
    allDay,
    url: event.htmlLink ?? null,
    syncedAt: new Date(),
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if gog is available (local/Mac mini)
    try {
      await execAsync('which gog', { timeout: 5000 })
    } catch {
      return NextResponse.json({
        success: false,
        message: 'Google Calendar sync requires running on the Mac mini. Set up the Mac mini push cron to sync events to the dashboard.',
        hint: 'Run: openclaw cron add "gog-calendar-push" to set up automatic sync.',
      }, { status: 422 })
    }

    const calendars = Object.keys(CALENDAR_MAP)
    let totalSynced = 0
    const errors: string[] = []

    for (const calId of calendars) {
      try {
        const events = await fetchFromGog(calId)
        if (events.length === 0) continue

        const rows = events.map(e => parseEventRow(e, calId))

        await db.insert(calendarEvents)
          .values(rows)
          .onConflictDoUpdate({
            target: calendarEvents.id,
            set: {
              title: calendarEvents.title,
              description: calendarEvents.description,
              location: calendarEvents.location,
              startTime: calendarEvents.startTime,
              endTime: calendarEvents.endTime,
              allDay: calendarEvents.allDay,
              url: calendarEvents.url,
              syncedAt: new Date(),
            },
          })

        totalSynced += rows.length
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${calId}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      synced: totalSynced,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[POST /api/calendar/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const count = await db.select({ id: calendarEvents.id }).from(calendarEvents)
    return NextResponse.json({ eventCount: count.length })
  } catch (error) {
    console.error('[GET /api/calendar/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
