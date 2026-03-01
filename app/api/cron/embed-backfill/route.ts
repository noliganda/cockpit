import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activityLog } from '@/lib/db/schema'
import { isNull, desc } from 'drizzle-orm'
import { generateEmbeddingAsync } from '@/lib/embeddings'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'No OpenAI API key' })
  }

  const nullEmbeddings = await db
    .select({ id: activityLog.id, action: activityLog.action, entityType: activityLog.entityType, description: activityLog.description })
    .from(activityLog)
    .where(isNull(activityLog.embedding))
    .orderBy(desc(activityLog.createdAt))
    .limit(50)

  let processed = 0
  for (const entry of nullEmbeddings) {
    const text = [entry.action, entry.entityType, entry.description].filter(Boolean).join(' ')
    await generateEmbeddingAsync(entry.id, text)
    processed++
  }

  return NextResponse.json({ success: true, processed })
}
