import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1),
  NOTION_API_KEY: z.string().min(1),
  NOTION_KORUS_TASKS_DB: z.string().min(1),
  NOTION_BF_TASKS_DB: z.string().min(1),
  NOTION_OC_TASKS_DB: z.string().min(1),
  AUTH_PASSWORD_HASH: z.string().optional(),
  KORUS_GUEST_PASSWORD_HASH: z.string().optional(),
  CRON_SECRET: z.string().default('charlie-cron-2026'),
  OPENAI_API_KEY: z.string().optional(),
  OPENCLAW_GATEWAY_URL: z.string().default('ws://localhost:18789'),
  OPENCLAW_GATEWAY_TOKEN: z.string().optional(),
})

export const env = envSchema.parse(process.env)
