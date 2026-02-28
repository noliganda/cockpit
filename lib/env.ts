import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NOTION_API_KEY: z.string().min(1),
  NOTION_KORUS_TASKS_DB: z.string().default('e98b3f42-2fba-4c5c-9f3c-45078e935c89'),
  NOTION_BF_TASKS_DB: z.string().default('40586981-fc6a-46d4-ac30-7f8ab7b50f5b'),
  NOTION_OC_TASKS_DB: z.string().default('7412d365-b9e6-4ebf-8a07-055ff052e9fb'),
  AUTH_PASSWORD_HASH: z.string().optional(),
  CRON_SECRET: z.string().default('charlie-cron-2026'),
});

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    // Don't throw during build — just warn
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      NOTION_API_KEY: process.env.NOTION_API_KEY ?? '',
      NOTION_KORUS_TASKS_DB: process.env.NOTION_KORUS_TASKS_DB ?? 'e98b3f42-2fba-4c5c-9f3c-45078e935c89',
      NOTION_BF_TASKS_DB: process.env.NOTION_BF_TASKS_DB ?? '40586981-fc6a-46d4-ac30-7f8ab7b50f5b',
      NOTION_OC_TASKS_DB: process.env.NOTION_OC_TASKS_DB ?? '7412d365-b9e6-4ebf-8a07-055ff052e9fb',
      AUTH_PASSWORD_HASH: process.env.AUTH_PASSWORD_HASH,
      CRON_SECRET: process.env.CRON_SECRET ?? 'charlie-cron-2026',
    };
  }
  return parsed.data;
}

export const env = validateEnv();
