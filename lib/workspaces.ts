import { db } from './db'
import { workspaces } from './db/schema'
import { asc } from 'drizzle-orm'

export interface WorkspaceSummary {
  id: string
  name: string
  slug: string
  color: string
  icon: string | null
}

/**
 * Canonical workspaces, read from the DB `workspaces` table.
 * This is the source of truth for valid `workspaceId` values — the UI's
 * hardcoded list in `types/index.ts` mirrors it, but harnesses should
 * discover IDs here (GET /api/workspaces) rather than guess.
 */
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      color: workspaces.color,
      icon: workspaces.icon,
    })
    .from(workspaces)
    .orderBy(asc(workspaces.name))
}

/** Just the valid workspace IDs (e.g. `byron-film`, `korus`, `personal`). */
export async function getWorkspaceIds(): Promise<string[]> {
  const rows = await listWorkspaces()
  return rows.map((w) => w.id)
}
