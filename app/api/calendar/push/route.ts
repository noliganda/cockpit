/**
 * Calendar push endpoint — called by Mac mini cron to sync Google Calendar events
 * to the Vercel-deployed dashboard (where gog CLI isn't available).
 *
 * Auth: Bearer token via CALENDAR_PUSH_SECRET env var (or CRON_SECRET as fallback)
 * Usage from Mac mini:
 *   GOG_ACCOUNT=charlie@byronfilm.com gog calendar events olivier@byronfilm.com \
 *     --from $(date +%Y-%m-%d) --to $(date -v+30d +%Y-%m-%d) --json | \
 *     curl -s -X POST https://your-app.vercel.app/api/calendar/push \
 *     -H "Authorization: Bearer $CALENDAR_PUSH_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d @- --data-urlencode "calendarId=olivier@byronfilm.com"
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calendarEvents } from '@/lib/db/schema'

const CALENDAR_MAP: Record<string, string> = {
  'olivier@byronfilm.com': 'byron-film',
  'charlie@byronfilm.com': 'byron-film',
  'hey@oliviermarcolin.com': 'personal',
}

interface IncomingEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  htmlLink?: string
}

interface PushPayload {
  calendarId: string
  events: IncomingEvent[]
}

export async function POST(request: NextRequest) {
  // Auth check
  const secret = process.env.CALENDAR_PUSH_SECRET ?? process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (!auth || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const { calendarId, events } = await request.json() as PushPayload

    if (!calendarId || !Array.isArray(events)) {
      return NextResponse.json({ error: 'calendarId and events[] required' }, { status: 400 })
    }

    const workspaceId = CALENDAR_MAP[calendarId] ?? 'personal'

    const rows = events.map(e => {
      const allDay = !e.start?.dateTime
      return {
        id: `${calendarId}::${e.id}`,
        workspaceId,
        calendarId,
        title: e.summary ?? '(No title)',
        description: e.description ?? null,
        location: e.location ?? null,
        startTime: e.start?.dateTime
          ? new Date(e.start.dateTime)
          : new Date(`${e.start?.date}T00:00:00`),
        endTime: e.end?.dateTime
          ? new Date(e.end.dateTime)
          : new Date(`${e.end?.date}T23:59:59`),
        allDay,
        url: e.htmlLink ?? null,
        syncedAt: new Date(),
      }
    })

    if (rows.length > 0) {
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
    }

    return NextResponse.json({ success: true, synced: rows.length, calendarId, workspaceId })
  } catch (error) {
    console.error('[POST /api/calendar/push]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
