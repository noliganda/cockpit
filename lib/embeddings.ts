import OpenAI from 'openai'
import { db } from './db'
import { activityLog } from './db/schema'
import { eq } from 'drizzle-orm'

const EMBEDDING_MODEL = 'text-embedding-3-small'

let openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI()
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  })
  return response.data[0].embedding
}

export async function generateEmbeddingAsync(activityId: string, text: string): Promise<void> {
  try {
    const embedding = await generateEmbedding(text)
    await db
      .update(activityLog)
      .set({
        embedding,
        embeddingModel: EMBEDDING_MODEL,
      })
      .where(eq(activityLog.id, activityId))
  } catch (err) {
    console.error('Failed to generate embedding for activity', activityId, err)
  }
}
