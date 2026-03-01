'use client'
import { useState } from 'react'
import { RefreshCw, Database, Shield, HardDrive } from 'lucide-react'

export function SettingsClient() {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  async function handleNotionSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync/notion', { method: 'POST' })
      const data = await res.json() as { success?: boolean; results?: Array<{ workspaceId: string; created: number; updated: number }> }
      if (data.success && data.results) {
        const summary = data.results.map(r => `${r.workspaceId}: +${r.created} created, ${r.updated} updated`).join(' | ')
        setSyncResult(`Sync complete: ${summary}`)
      } else {
        setSyncResult('Sync failed')
      }
    } catch { setSyncResult('Sync error') }
    finally { setSyncing(false) }
  }

  async function handleSeed() {
    setSeeding(true)
    setSeedResult(null)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json() as { success?: boolean; workspacesSeeded?: number; areasSeeded?: number }
      setSeedResult(data.success ? `Seeded ${data.workspacesSeeded} workspaces, ${data.areasSeeded} areas` : 'Seed failed')
    } catch { setSeedResult('Seed error') }
    finally { setSeeding(false) }
  }

  async function handleObsidianExport(workspaceId: string) {
    setExporting(true)
    try {
      await fetch('/api/backup/obsidian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })
    } finally { setExporting(false) }
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight mb-8">Settings</h1>
      <div className="space-y-4">
        <Section icon={RefreshCw} title="Notion Sync">
          <p className="text-xs text-[#6B7280] mb-3">Pull tasks from all three Notion databases into this dashboard.</p>
          <div className="flex items-center gap-3">
            <Btn onClick={handleNotionSync} disabled={syncing}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Btn>
            {syncResult && <p className="text-xs text-[#A0A0A0]">{syncResult}</p>}
          </div>
        </Section>

        <Section icon={Database} title="Seed Defaults">
          <p className="text-xs text-[#6B7280] mb-3">Seed default workspaces and areas into the database.</p>
          <div className="flex items-center gap-3">
            <Btn onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Seeding…' : 'Seed defaults'}
            </Btn>
            {seedResult && <p className="text-xs text-[#A0A0A0]">{seedResult}</p>}
          </div>
        </Section>

        <Section icon={HardDrive} title="Obsidian Export">
          <p className="text-xs text-[#6B7280] mb-3">Export tasks and notes to your Obsidian vault at ~/Library/Mobile Documents/com~apple~CloudDocs/OpsOS/</p>
          <div className="flex items-center gap-2 flex-wrap">
            {['byron-film', 'korus', 'personal'].map(ws => (
              <Btn key={ws} onClick={() => handleObsidianExport(ws)} disabled={exporting}>
                Export {ws}
              </Btn>
            ))}
          </div>
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
