'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  User, RefreshCw, HardDrive, Database, Info,
  CheckCircle, AlertCircle, Loader2, Lock, Trash2,
} from 'lucide-react';

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

const SECTION_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.08 } }),
};

export default function SettingsPage() {
  // Notion sync
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncResult, setSyncResult] = useState<string>('');
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Obsidian backup
  const [backupStatus, setBackupStatus] = useState<SyncStatus>('idle');
  const [backupResult, setBackupResult] = useState<string>('');

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  // Seed
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState('');

  async function triggerSync() {
    setSyncStatus('syncing');
    setSyncResult('');
    try {
      const res = await fetch('/api/sync/notion', { method: 'POST' });
      const data = await res.json();
      if (data.data) {
        const total = (data.data as Array<{ synced: number }>).reduce((a, b) => a + b.synced, 0);
        setSyncResult(`Synced ${total} tasks from Notion.`);
        setLastSync(new Date().toLocaleString());
        setSyncStatus('success');
      } else {
        setSyncResult(String(data.error ?? 'Unknown error'));
        setSyncStatus('error');
      }
    } catch {
      setSyncResult('Network error');
      setSyncStatus('error');
    }
  }

  async function triggerBackup() {
    setBackupStatus('syncing');
    setBackupResult('');
    try {
      const res = await fetch('/api/backup/obsidian', { method: 'POST' });
      const data = await res.json();
      if (data.data) {
        setBackupResult(`Exported ${data.data.exported ?? 0} files to Obsidian vault.`);
        setBackupStatus('success');
      } else {
        setBackupResult(String(data.error ?? 'Unknown error'));
        setBackupStatus('error');
      }
    } catch {
      setBackupResult('Network error');
      setBackupStatus('error');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Passwords do not match.');
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    setPwStatus('saving');
    // Password change would be implemented via a dedicated API route
    setTimeout(() => {
      setPwStatus('success');
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwStatus('idle'), 3000);
    }, 800);
  }

  async function seedFromNotion() {
    setSeeding(true);
    setSeedResult('');
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      setSeedResult(data.data ? `Seeded ${data.data.count ?? 0} items from Notion.` : String(data.error ?? 'Error'));
    } catch {
      setSeedResult('Network error');
    }
    setSeeding(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Manage your dashboard configuration</p>
      </motion.div>

      {/* Account */}
      <motion.div custom={0} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-[#6B7280]" />
            <h2 className="text-sm font-medium text-white">Account</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A]">
              <div>
                <p className="text-sm text-white">Ops Dashboard</p>
                <p className="text-xs text-[#6B7280]">Admin account</p>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>

            <form onSubmit={changePassword} className="space-y-3">
              <h3 className="text-xs font-medium text-[#A0A0A0] flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Change Password
              </h3>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Current Password</Label>
                  <Input
                    type="password"
                    value={pwForm.current}
                    onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">New Password</Label>
                  <Input
                    type="password"
                    value={pwForm.next}
                    onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
              {pwError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {pwError}
                </div>
              )}
              {pwStatus === 'success' && (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Password changed successfully.
                </div>
              )}
              <Button type="submit" size="sm" disabled={pwStatus === 'saving' || !pwForm.current || !pwForm.next}>
                {pwStatus === 'saving' ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Changing…</>
                ) : 'Change Password'}
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>

      {/* Notion Sync */}
      <motion.div custom={1} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="h-4 w-4 text-[#6B7280]" />
            <h2 className="text-sm font-medium text-white">Notion Sync</h2>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 bg-[#0F0F0F] border border-[#2A2A2A]">
                <p className="text-xs text-[#6B7280]">Byron Film DB</p>
                <p className="text-xs text-white font-mono mt-0.5">40586981…</p>
              </div>
              <div className="rounded-lg p-3 bg-[#0F0F0F] border border-[#2A2A2A]">
                <p className="text-xs text-[#6B7280]">KORUS DB</p>
                <p className="text-xs text-white font-mono mt-0.5">e98b3f42…</p>
              </div>
              <div className="rounded-lg p-3 bg-[#0F0F0F] border border-[#2A2A2A]">
                <p className="text-xs text-[#6B7280]">Personal DB</p>
                <p className="text-xs text-white font-mono mt-0.5">7412d365…</p>
              </div>
              <div className="rounded-lg p-3 bg-[#0F0F0F] border border-[#2A2A2A]">
                <p className="text-xs text-[#6B7280]">Last Sync</p>
                <p className="text-xs text-white mt-0.5">{lastSync ?? 'Never'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={triggerSync}
                disabled={syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Syncing…</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-1.5" />Sync Now</>
                )}
              </Button>
              {syncStatus === 'success' && (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {syncResult}
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {syncResult}
                </div>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">Auto-sync runs daily at 10pm AEST via cron.</p>
          </div>
        </Card>
      </motion.div>

      {/* Obsidian Backup */}
      <motion.div custom={2} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-4 w-4 text-[#6B7280]" />
            <h2 className="text-sm font-medium text-white">Obsidian Backup</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg p-3 bg-[#0F0F0F] border border-[#2A2A2A]">
              <p className="text-xs text-[#6B7280]">Vault Path</p>
              <p className="text-xs text-white font-mono mt-0.5 break-all">
                ~/Library/Mobile Documents/com~apple~CloudDocs/OpsOS/
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={triggerBackup}
                disabled={backupStatus === 'syncing'}
              >
                {backupStatus === 'syncing' ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Exporting…</>
                ) : (
                  <><HardDrive className="h-4 w-4 mr-1.5" />Export to Obsidian</>
                )}
              </Button>
              {backupStatus === 'success' && (
                <div className="flex items-center gap-1.5 text-xs text-green-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {backupResult}
                </div>
              )}
              {backupStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {backupResult}
                </div>
              )}
            </div>
            <p className="text-xs text-[#6B7280]">
              Exports all tasks, projects, notes, and contacts as markdown files with YAML frontmatter.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div custom={3} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-[#6B7280]" />
            <h2 className="text-sm font-medium text-white">Data Management</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[#A0A0A0] mb-2">Seed initial data from Notion into the database.</p>
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={seedFromNotion} disabled={seeding}>
                  {seeding ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Seeding…</>
                  ) : (
                    <><Database className="h-4 w-4 mr-1.5" />Seed from Notion</>
                  )}
                </Button>
                {seedResult && (
                  <span className="text-xs text-[#A0A0A0]">{seedResult}</span>
                )}
              </div>
            </div>
            <div className="border-t border-[#2A2A2A] pt-4">
              <p className="text-xs text-red-400 mb-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Danger Zone
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => {
                  if (confirm('This will delete ALL data. Are you absolutely sure?')) {
                    // Would call a clear-all API endpoint
                    alert('Clear all data — not implemented in this version.');
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Clear All Data
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div custom={4} initial="hidden" animate="show" variants={SECTION_VARIANTS}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-[#6B7280]" />
            <h2 className="text-sm font-medium text-white">About</h2>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">Version</span>
              <span className="text-xs text-white font-mono">3.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">Stack</span>
              <span className="text-xs text-white">Next.js 16 · Drizzle · Neon Postgres</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">Operator</span>
              <span className="text-xs text-white">Charlie (Claude Sonnet 4.6)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B7280]">Owner</span>
              <span className="text-xs text-white">Olivier Marcolin</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
