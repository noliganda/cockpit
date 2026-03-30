import { NextResponse } from 'next/server'

// Notion sync is DISABLED — Cockpit is now the source of truth
// To re-enable, restore the syncAllNotionDatabases() call and check CRON_SECRET
export async function GET() {
  return NextResponse.json({ 
    disabled: true, 
    message: 'Notion sync is disabled. Cockpit is the source of truth.' 
  }, { status: 200 })
}
