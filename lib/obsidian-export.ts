import { db } from './db'
import { tasks } from './db/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs/promises'
import path from 'path'

const VAULT_PATH = path.join(
  process.env.HOME ?? '~',
  'Library/Mobile Documents/com~apple~CloudDocs/OpsOS'
)

function toYamlValue(value: unknown): string {
  if (value === null || value === undefined) return '""'
  if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return `[${value.map(v => toYamlValue(v)).join(', ')}]`
  return `"${String(value)}"`
}

function toFrontmatter(data: Record<string, unknown>): string {
  const lines = ['---']
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase()
    lines.push(`${snakeKey}: ${toYamlValue(value)}`)
  }
  lines.push('---')
  return lines.join('\n')
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function exportToObsidian(workspaceId: string): Promise<{ exported: number; errors: string[] }> {
  const errors: string[] = []
  let exported = 0

  try {
    const allTasks = await db.select().from(tasks).where(eq(tasks.workspaceId, workspaceId))
    for (const task of allTasks) {
      try {
        const dir = path.join(VAULT_PATH, workspaceId, 'tasks')
        await fs.mkdir(dir, { recursive: true })
        const frontmatter = toFrontmatter({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          workspaceId: task.workspaceId,
          createdAt: task.createdAt.toISOString(),
        })
        const content = `${frontmatter}\n\n# ${task.title}\n\n${task.description ?? ''}`
        await fs.writeFile(path.join(dir, `${slugify(task.title)}.md`), content, 'utf-8')
        exported++
      } catch (err) {
        errors.push(`Task ${task.id}: ${String(err)}`)
      }
    }
  } catch (err) {
    errors.push(`Export failed: ${String(err)}`)
  }

  return { exported, errors }
}
