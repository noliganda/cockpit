/**
 * GET /api/cron/notion-sync
 *
 * Vercel Cron job — runs every 6 hours.
 * Triggers a full one-way Notion → dashboard task sync.
 *
 * Protected by CRON_SECRET environment variable (set in Vercel).
 * Vercel calls cron jobs with Authorization: Bearer <CRON_SECRET>.
 */

import { NextRequest, NextResponse } from 'next/server';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  // If no secret is set, allow all (useful for dev)
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  console.log('[cron/notion-sync] Starting Notion sync...');

  try {
    const res = await fetch(`${appUrl}/api/sync/notion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass the cron secret through so any auth on the sync endpoint works
        'x-cron-secret': process.env.CRON_SECRET || '',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[cron/notion-sync] Sync failed:', err);
      return NextResponse.json(
        { error: 'Notion sync failed', details: err },
        { status: 500 },
      );
    }

    const data = await res.json() as {
      success: boolean;
      report: {
        totalCreated: number;
        totalUpdated: number;
        totalSkipped: number;
        durationMs: number;
        errors: string[];
      };
    };

    const { report } = data;
    console.log(
      `[cron/notion-sync] Complete — created: ${report.totalCreated}, updated: ${report.totalUpdated}, ` +
      `skipped: ${report.totalSkipped}, duration: ${report.durationMs}ms`,
    );

    if (report.errors.length > 0) {
      console.warn('[cron/notion-sync] Errors:', report.errors);
    }

    return NextResponse.json({
      success: true,
      created: report.totalCreated,
      updated: report.totalUpdated,
      skipped: report.totalSkipped,
      durationMs: report.durationMs,
      errors: report.errors,
    });
  } catch (err) {
    console.error('[cron/notion-sync] Fatal error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
