'use client'
import { useState } from 'react'
import { RefreshCw, Database, Shield, HardDrive, Users, Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { type SessionData } from '@/lib/auth'

interface UserRow {
  id: string
  email: string
  name: string | null
  role: string | null
  createdAt: Date
}

interface CreateUserFormProps {
  onCreated: (user: UserRow) => void
  onCancel: () => void
}

function CreateUserForm({ onCreated, onCancel }: CreateUserFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'collaborator' | 'guest'>('collaborator')
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    if (!email || !password) return
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, password, role }),
      })
      if (res.ok) {
        const user = await res.json() as UserRow
        onCreated(user)
        toast.success('User created')
      } else {
        const data = await res.json() as { error?: string }
        toast.error(data.error ?? 'Failed to create user')
      }
    } catch { toast.error('Error creating user') }
    finally { setCreating(false) }
  }

  return (
    <div className="p-3 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full name (optional)"
        className="w-full px-3 py-2 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)]"
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email address"
        className="w-full px-3 py-2 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)]"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password (min 6 chars)"
        className="w-full px-3 py-2 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)]"
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value as 'admin' | 'collaborator' | 'guest')}
        className="w-full px-3 py-2 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] appearance-none"
      >
        <option value="admin">Admin — full access</option>
        <option value="collaborator">Collaborator — create/edit, no settings</option>
        <option value="guest">Guest — view only</option>
      </select>
      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={creating || !email || !password}
          className="px-4 py-2 text-sm font-medium bg-[#281E16] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#2F241A] disabled:opacity-40 transition-colors">
          {creating ? 'Creating...' : 'Create user'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 text-sm font-medium bg-[#281E16] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#2F241A] transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
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
      const data = await res.json() as { success?: boolean; disabled?: boolean; message?: string; results?: Array<{ workspaceId: string; created: number; updated: number }> }
      if (data.disabled) {
        toast.info(data.message ?? 'Notion sync is currently disabled. Set NOTION_SYNC_ENABLED=true in Vercel env to re-enable.')
      } else if (data.success && data.results) {
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
    <div className="p-5 rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)]">
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="w-4 h-4 text-[#7A6F55]" />
        <h2 className="text-sm font-semibold text-[#E8DFCE]">{title}</h2>
      </div>
      {children}
    </div>
  )

  const Btn = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled}
      className="px-4 py-2 text-sm font-medium bg-[#281E16] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#2F241A] disabled:opacity-40 transition-colors">
      {children}
    </button>
  )

  const ROLE_COLORS: Record<string, string> = {
    admin: 'text-[#C99A1F] bg-[rgba(201,154,31,0.12)]',
    collaborator: 'text-[#5F7A72] bg-[rgba(95,122,114,0.12)]',
    guest: 'text-[#7A6F55] bg-[rgba(122,111,85,0.12)]',
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Settings</h1>
        {sessionData && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#7A6F55]">{sessionData.email}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[sessionData.role] ?? 'text-[#7A6F55]'}`}>
              {sessionData.role}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* User Management — admin only */}
        {isAdmin && (
          <Section icon={Users} title="User Management">
            <p className="text-xs text-[#7A6F55] mb-4">
              Manage user accounts and roles.
              <span className="text-[#C99A1F]"> Admin</span> — full access.
              <span className="text-[#5F7A72]"> Collaborator</span> — create/edit, no settings.
              <span className="text-[#7A6F55]"> Guest</span> — view only.
            </p>

            {userList.length > 0 && (
              <div className="rounded-none border border-[rgba(167,155,120,0.13)] overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(167,155,120,0.13)]">
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">Email</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#7A6F55] uppercase tracking-wide">Created</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-[#7A6F55] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map(user => (
                      <tr key={user.id} className="border-b border-[rgba(167,155,120,0.09)] last:border-0">
                        <td className="px-3 py-2.5 text-sm text-[#E8DFCE]">{user.name ?? <span className="text-[#5C5340]">—</span>}</td>
                        <td className="px-3 py-2.5 text-sm text-[#A79B78]">{user.email}</td>
                        <td className="px-3 py-2.5">
                          {editingUserId === user.id ? (
                            <select
                              value={editRole}
                              onChange={e => setEditRole(e.target.value as 'admin' | 'collaborator' | 'guest')}
                              className="px-2 py-1 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] text-xs outline-none"
                            >
                              <option value="admin">admin</option>
                              <option value="collaborator">collaborator</option>
                              <option value="guest">guest</option>
                            </select>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[user.role ?? 'guest'] ?? 'text-[#7A6F55]'}`}>
                              {user.role ?? 'guest'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#7A6F55]">
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
                                  className="px-2 py-1 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] text-xs outline-none w-32"
                                />
                                <button
                                  onClick={() => handleSaveEdit(user.id)}
                                  disabled={savingEdit}
                                  className="p-1.5 rounded-none text-[#7D9B5E] hover:bg-[rgba(125,155,94,0.1)] transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { setEditingUserId(null); setEditPassword('') }}
                                  className="p-1.5 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setEditingUserId(user.id); setEditRole((user.role ?? 'collaborator') as 'admin' | 'collaborator' | 'guest') }}
                                  className="p-1.5 rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => { if (confirm(`Delete user ${user.email}?`)) handleDeleteUser(user.id) }}
                                  disabled={deletingUserId === user.id || user.id === sessionData?.userId}
                                  className="p-1.5 rounded-none text-[#7A6F55] hover:text-[#C0452E] hover:bg-[rgba(192,69,46,0.08)] transition-colors disabled:opacity-30"
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
              <CreateUserForm
                onCreated={user => { setUserList(prev => [...prev, user]); setShowCreateUser(false) }}
                onCancel={() => setShowCreateUser(false)}
              />
            ) : (
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-1.5 text-sm text-[#A79B78] hover:text-[#E8DFCE] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add user
              </button>
            )}
          </Section>
        )}

        <Section icon={RefreshCw} title="Notion Sync">
          <p className="text-xs text-[#7A6F55] mb-2">Pull tasks from Notion databases into Cockpit.</p>
          <p className="text-xs text-[#C9962E] mb-3">⚠️ Currently disabled — <code className="text-xs bg-[#140F0B] px-1 rounded-none">NOTION_SYNC_ENABLED=false</code> is set in Vercel. Clicking &quot;Sync now&quot; will show a message instead of syncing. To re-enable, update <code className="text-xs bg-[#140F0B] px-1 rounded-none">NOTION_SYNC_ENABLED</code> to <code className="text-xs bg-[#140F0B] px-1 rounded-none">true</code> in Vercel environment variables.</p>
          <Btn onClick={handleNotionSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </Btn>
        </Section>

        <Section icon={Database} title="Seed Defaults">
          <p className="text-xs text-[#7A6F55] mb-3">Seed default workspaces and areas into the database.</p>
          <Btn onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed defaults'}
          </Btn>
        </Section>

        <Section icon={HardDrive} title="Obsidian Backup">
          <p className="text-xs text-[#7A6F55] mb-3">
            Back up all tasks and notes to your Obsidian vault.
            {lastBackup && <span className="ml-2 text-[#A79B78]">Last backup: {lastBackup}</span>}
          </p>
          <Btn onClick={handleObsidianBackup} disabled={backing}>
            {backing ? 'Backing up…' : 'Backup to Obsidian'}
          </Btn>
        </Section>

        <Section icon={Shield} title="Auth">
          <p className="text-xs text-[#7A6F55] mb-3">Session management. Password set via AUTH_PASSWORD_HASH env var.</p>
          <Btn onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login' }}>
            Sign out
          </Btn>
        </Section>
      </div>
    </div>
  )
}
