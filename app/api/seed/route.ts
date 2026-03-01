import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { workspaces, areas, users } from '@/lib/db/schema'
import { getSession, hashPassword } from '@/lib/auth'

const DEFAULT_WORKSPACES = [
  { id: 'byron-film', name: 'Byron Film', slug: 'byron-film', color: '#D4A017', icon: '🎬' },
  { id: 'korus', name: 'KORUS Group', slug: 'korus', color: '#008080', icon: '🌏' },
  { id: 'personal', name: 'Personal', slug: 'personal', color: '#F97316', icon: '👤' },
]

const DEFAULT_AREAS: Array<{ workspaceId: string; name: string; icon: string; order: number }> = [
  { workspaceId: 'byron-film', name: 'Leadership', icon: '👑', order: 1 },
  { workspaceId: 'byron-film', name: 'Finances', icon: '💰', order: 2 },
  { workspaceId: 'byron-film', name: 'Operations', icon: '⚙️', order: 3 },
  { workspaceId: 'byron-film', name: 'Growth', icon: '📈', order: 4 },
  { workspaceId: 'byron-film', name: 'Production', icon: '🎬', order: 5 },
  { workspaceId: 'byron-film', name: 'Service', icon: '🎯', order: 6 },
  { workspaceId: 'byron-film', name: 'Sales', icon: '💼', order: 7 },
  { workspaceId: 'byron-film', name: 'Marketing', icon: '📣', order: 8 },
  { workspaceId: 'byron-film', name: 'AI/Automations', icon: '🤖', order: 9 },
  { workspaceId: 'korus', name: 'Leadership', icon: '👑', order: 1 },
  { workspaceId: 'korus', name: 'Finances', icon: '💰', order: 2 },
  { workspaceId: 'korus', name: 'Operations', icon: '⚙️', order: 3 },
  { workspaceId: 'korus', name: 'Growth', icon: '📈', order: 4 },
  { workspaceId: 'korus', name: 'Production', icon: '🏗️', order: 5 },
  { workspaceId: 'korus', name: 'Service', icon: '🎯', order: 6 },
  { workspaceId: 'korus', name: 'Sales', icon: '💼', order: 7 },
  { workspaceId: 'korus', name: 'Marketing', icon: '📣', order: 8 },
  { workspaceId: 'personal', name: 'Life Admin', icon: '🏠', order: 1 },
  { workspaceId: 'personal', name: 'Health', icon: '💪', order: 2 },
  { workspaceId: 'personal', name: 'Learning', icon: '📚', order: 3 },
]

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  for (const ws of DEFAULT_WORKSPACES) {
    await db.insert(workspaces).values(ws).onConflictDoNothing()
  }

  let areasCreated = 0
  for (const area of DEFAULT_AREAS) {
    await db.insert(areas).values(area).onConflictDoNothing()
    areasCreated++
  }

  // Seed default admin users
  const DEFAULT_USERS = [
    { email: 'charlie@byronfilm.com', name: 'Charlie', role: 'admin' as const, password: 'changeme123' },
    { email: 'olivier@byronfilm.com', name: 'Olivier Marcolin', role: 'admin' as const, password: 'changeme123' },
  ]
  for (const u of DEFAULT_USERS) {
    const passwordHash = await hashPassword(u.password)
    await db.insert(users)
      .values({ email: u.email, name: u.name, role: u.role, passwordHash })
      .onConflictDoNothing()
  }

  return NextResponse.json({ success: true, workspacesSeeded: DEFAULT_WORKSPACES.length, areasSeeded: areasCreated })
}
