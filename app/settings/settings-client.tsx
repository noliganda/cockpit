'use client'
import { useState } from 'react'
import { RefreshCw, Database, Shield, HardDrive, Users, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { type SessionData } from '@/lib/auth'

interface UserRow {
  id: string
  email: string
  role: string | null
  createdAt: Date
}

interface SettingsClientProps {
  sessionData: SessionData | null
  initialUsers: UserRow[]
}

export function SettingsClient({ sessionData, initialUsers }: SettingsClientProps) {
  const [syncing, setSyncing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [backing, setBacking] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  // User management state
  const [userList, setUserList] = useState(initialUsers)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'collaborator' | 'guest'>('collaborator')
  const [creatingUser, setCreatingUser] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<'admin' | 'collaborator' | 'guest'>('collaborator')
  const [editPassword, setEditPassword] = useState('')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const isAdmin = sessionData?.role === 'admin'

  async function handleNotionSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/notion', { method: 'POST' })
      const data = await res.json() as { success?: boolean; results?: Array<{ workspaceId: string; created: number; updated: number }> }
      if (data.success && data.results) {
        const summary = data.results.map(r => `${r.workspaceId}: +${r.created} created, ${r.updated} updated`).join(' | ')
        toast.success(`Sync complete: ${summary}`)
      } else {
        toast.error('Sync failed')
      }
    } catch { toast.error('Sync error') }
    finally { setSyncing(false) }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json() as { success?: boolean; workspacesSeeded?: number; areasSeeded?: number }
      if (data.success) {
        toast.success(`Seeded ${data.workspacesSeeded} workspaces, ${data.areasSeeded} areas`)
      } else {
        toast.error('Seed failed')
      }
    } catch { toast.error('Seed error') }
    finally { setSeeding(false) }
  }

  async function handleObsidianBackup() {
    setBacking(true)
    try {
      const res = await fetch('/api/backup/obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'all' }),
      })
      if (res.ok) {
        const now = new Date().toLocaleString('en-AU')
        setLastBackup(now)
        toast.success('Backup to Obsidian complete')
      } else {
        toast.error('Backup failed')
      }
    } catch { toast.error('Backup error') }
    finally { setBacking(false) }
  }

  async function handleCreateUser() {
    if (!newEmail || !newPassword) return
    setCreatingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      })
      if (res.ok) {
        const user = await res.json() as UserRow
        setUserList(prev => [...prev, user])
        setNewEmail(''); setNewPassword(''); setShowCreateUser(false)
        toast.success('User created')
      } else {
        const data = await res.json() as { error?: string }
        toast.error(data.error ?? 'Failed to create user')
      }
    } catch { toast.error('Error creating user') }
    finally { setCreatingUser(false) }
  }

  async function handleSaveEdit(userId: string) {
    setSavingEdit(true)
    try {
      const body: { role?: string; password?: string } = { role: editRole }
      if (editPassword) body.password = editPassword
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json() as UserRow
        setUserList(prev => prev.map(u => u.id === userId ? updated : u))
        setEditingUserId(null); setEditPassword('')
        toast.success('User updated')
      } else {
        toast.error('Failed to update user')
      }
    } catch { toast.error('Error updating user') }
    finally { setSavingEdit(false) }
  }

  async function handleDeleteUser(userId: string) {
    setDeletingUserId(userId)
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setUserList(prev => prev.filter(u => u.id !== userId))
        toast.success('User deleted')
      } else {
        const data = await res.json() as { error?: string }
        toast.error(data.error ?? 'Failed to delete user')
      }
    } catch { toast.error('Error deleting user') }
    finally { setDeletingUserId(null) }
  }

  const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="w-4 h-4 text-[#6B7280]" />
        <h2 className="text-sm font-semibold text-[#F5F5F5]">{title}</h2>
      </div>
      {children}
    </div>
  )

  const Btn = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled}
      className="px-4 py-2 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] disabled:opacity-40 transition-colors">
      {children}
    </button>
  )

  const ROLE_COLORS: Record<string, string> = {
    admin: 'text-[#D4A017] bg-[rgba(212,160,23,0.12)]',
    collaborator: 'text-[#3B82F6] bg-[rgba(59,130,246,0.12)]',
    guest: 'text-[#6B7280] bg-[rgba(107,114,128,0.12)]',
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Settings</h1>
        {sessionData && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">{sessionData.email}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[sessionData.role] ?? 'text-[#6B7280]'}`}>
              {sessionData.role}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* User Management — admin only */}
        {isAdmin && (
          <Section icon={Users} title="User Management">
            <p className="text-xs text-[#6B7280] mb-4">
              Manage user accounts and roles.
              <span className="text-[#D4A017]"> Admin</span> — full access.
              <span className="text-[#3B82F6]"> Collaborator</span> — create/edit, no settings.
              <span className="text-[#6B7280]"> Guest</span> — view only.
            </p>

            {userList.length > 0 && (
              <div className="rounded-[6px] border border-[rgba(255,255,255,0.06)] overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)]">
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wide">Created</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-[#6B7280] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map(user => (
                      <tr key={user.id} className="border-b border-[rgba(255,255,255,0.04)] last:border-0">
                        <td className="px-3 py-2.5 text-sm text-[#F5F5F5]">{user.email}</td>
                        <td className="px-3 py-2.5">
                          {editingUserId === user.id ? (
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value as 'admin' | 'collaborator' | 'guest')}
                              className="px-2 py-1 rounded-[4px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs outline-none"
                            >
                              <option value="admin">admin</option>
                              <option value="collaborator">collaborator</option>
                              <option value="guest">guest</option>
                            </select>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[user.role ?? 'guest'] ?? 'text-[#6B7280]'}`}>
                              {user.role ?? 'guest'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#6B7280]">
                          {new Date(user.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            {editingUserId === user.id ? (
                              <>
                                <input
                                  type="password"
                                  value={editPassword}
                                  onChange={e => setEditPassword(e.target.value)}
                                  placeholder="New password"
                                  className="px-2 py-1 rounded-[4px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] text-xs outline-none w-32"
                                />
                                <button
                                  onClick={() => handleSaveEdit(user.id)}
                                  disabled={savingEdit}
                                  className="p-1.5 rounded-[4px] text-[#22C55E] hover:bg-[rgba(34,197,94,0.1)] transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setEditingUserId(null); setEditPassword('') }}
                                  className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditingUserId(user.id); setEditRole((user.role ?? 'collaborator') as 'admin' | 'collaborator' | 'guest') }}
                                  className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete user ${user.email}?`)) handleDeleteUser(user.id) }}
                                  disabled={deletingUserId === user.id || user.id === sessionData?.userId}
                                  className="p-1.5 rounded-[4px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors disabled:opacity-30"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showCreateUser ? (
              <div className="p-3 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)]"
                />
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'admin' | 'collaborator' | 'guest')}
                  className="w-full px-3 py-2 rounded-[6px] bg-[#141414] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] appearance-none"
                >
                  <option value="admin">Admin — full access</option>
                  <option value="collaborator">Collaborator — create/edit, no settings</option>
                  <option value="guest">Guest — view only</option>
                </select>
                <div className="flex gap-2">
                  <Btn onClick={handleCreateUser} disabled={creatingUser || !newEmail || !newPassword}>
                    {creatingUser ? 'Creating...' : 'Create user'}
                  </Btn>
                  <Btn onClick={() => { setShowCreateUser(false); setNewEmail(''); setNewPassword('') }}>
                    Cancel
                  </Btn>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-1.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add user
              </button>
            )}
          </Section>
        )}

        <Section icon={RefreshCw} title="Notion Sync">
          <p className="text-xs text-[#6B7280] mb-3">Pull tasks from all three Notion databases into this dashboard.</p>
          <Btn onClick={handleNotionSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </Btn>
        </Section>

        <Section icon={Database} title="Seed Defaults">
          <p className="text-xs text-[#6B7280] mb-3">Seed default workspaces and areas into the database.</p>
          <Btn onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed defaults'}
          </Btn>
        </Section>

        <Section icon={HardDrive} title="Obsidian Backup">
          <p className="text-xs text-[#6B7280] mb-3">
            Back up all tasks and notes to your Obsidian vault.
            {lastBackup && <span className="ml-2 text-[#A0A0A0]">Last backup: {lastBackup}</span>}
          </p>
          <Btn onClick={handleObsidianBackup} disabled={backing}>
            {backing ? 'Backing up…' : 'Backup to Obsidian'}
          </Btn>
        </Section>

        <Section icon={Shield} title="Auth">
          <p className="text-xs text-[#6B7280] mb-3">Session management. Password set via AUTH_PASSWORD_HASH env var.</p>
          <Btn onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login' }}>
            Sign out
          </Btn>
        </Section>
      </div>
    </div>
  )
}
