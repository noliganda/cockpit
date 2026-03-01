import { redirect } from 'next/navigation'
import { getSession, getSessionData } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sessionData = await getSessionData()
  const allUsers = sessionData?.role === 'admin'
    ? await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt }).from(users)
    : []

  return <SettingsClient sessionData={sessionData} initialUsers={allUsers} />
}
