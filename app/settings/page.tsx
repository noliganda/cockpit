'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, LogOut, Eye, EyeOff, Check, Shield, Palette, Download, RefreshCw, CheckCircle2, Link2, Unlink2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useWorkspace } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { useContactStore } from '@/stores/contact-store';
import { WORKSPACES } from '@/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#2A2A2A]">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function exportToObsidian(tasks: ReturnType<typeof useTaskStore>['tasks'], projects: any[], contacts: any[], workspaceName: string, workspaceSlug: string) {
  const lines: string[] = [];
  const now = new Date().toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' });
  lines.push(`# ${workspaceName} — Ops OS Export`);
  lines.push(`> **Exported:** ${now}`);
  lines.push('');

  if (tasks.length > 0) {
    lines.push('## Tasks');
    lines.push('');
    tasks.forEach(t => {
      lines.push(`### ${t.title}`);
      lines.push(`- **Status:** ${t.status.replace(/-/g, ' ')}`);
      lines.push(`- **Priority:** ${t.priority}`);
      if (t.dueDate) lines.push(`- **Due:** ${t.dueDate}`);
      if (t.assignee) lines.push(`- **Assignee:** ${t.assignee}`);
      if (t.tags.length) lines.push(`- **Tags:** ${t.tags.join(', ')}`);
      if (t.description) lines.push(`> ${t.description}`);
      lines.push('');
    });
  }

  if (projects.length > 0) {
    lines.push('## Projects');
    lines.push('');
    projects.forEach(p => {
      lines.push(`### ${p.name}`);
      lines.push(`- **Status:** ${p.status}`);
      if (p.startDate) lines.push(`- **Start:** ${p.startDate}`);
      if (p.endDate) lines.push(`- **End:** ${p.endDate}`);
      if (p.budget) lines.push(`- **Budget:** $${p.budget.toLocaleString()}`);
      if (p.description) lines.push(`> ${p.description}`);
      lines.push('');
    });
  }

  if (contacts.length > 0) {
    lines.push('## Contacts');
    lines.push('');
    contacts.forEach(c => {
      lines.push(`### ${c.name}`);
      if (c.company) lines.push(`- **Company:** ${c.company}`);
      if (c.role) lines.push(`- **Role:** ${c.role}`);
      if (c.email) lines.push(`- **Email:** ${c.email}`);
      if (c.phone) lines.push(`- **Phone:** ${c.phone}`);
      if (c.pipelineStage) lines.push(`- **Stage:** ${c.pipelineStage}`);
      if (c.notes) lines.push(`> ${c.notes}`);
      lines.push('');
    });
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workspaceSlug}-export-${new Date().toISOString().split('T')[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const { logout, sessionExpiresAt } = useAuth();
  const { workspace } = useWorkspace();
  const { tasks: allTasks } = useTaskStore();
  const wsTasks = allTasks.filter(t => t.workspaceId === workspace.id);
  const { projects } = useProjectStore();
  const wsProjects = projects.filter(p => p.workspaceId === workspace.id);
  const { contacts } = useContactStore();
  const wsContacts = contacts.filter(c => c.workspaceId === workspace.id);

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleError, setGoogleError] = useState(false);
  const [msConnected, setMsConnected] = useState(false);
  const [msError, setMsError] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('google_connected') === 'true') setGoogleConnected(true);
      if (localStorage.getItem('microsoft_connected') === 'true') setMsConnected(true);
    } catch { /* ignore */ }

    const params = new URLSearchParams(window.location.search);
    const gs = params.get('google');
    const ms = params.get('microsoft');

    if (gs === 'connected') {
      setGoogleConnected(true);
      try { localStorage.setItem('google_connected', 'true'); } catch { /* ignore */ }
      window.history.replaceState({}, '', '/settings');
    } else if (gs === 'error') {
      setGoogleError(true);
      window.history.replaceState({}, '', '/settings');
      setTimeout(() => setGoogleError(false), 5000);
    }

    if (ms === 'connected') {
      setMsConnected(true);
      try { localStorage.setItem('microsoft_connected', 'true'); } catch { /* ignore */ }
      window.history.replaceState({}, '', '/settings');
    } else if (ms === 'error') {
      setMsError(true);
      window.history.replaceState({}, '', '/settings');
      setTimeout(() => setMsError(false), 5000);
    }
  }, []);

  function handleGoogleDisconnect() {
    setGoogleConnected(false);
    try { localStorage.removeItem('google_connected'); } catch { /* ignore */ }
  }

  function handleMicrosoftDisconnect() {
    setMsConnected(false);
    try { localStorage.removeItem('microsoft_connected'); } catch { /* ignore */ }
  }

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done'>('idle');
  const [lastExport, setLastExport] = useState<string | null>(() => {
    try { return localStorage.getItem('last_obsidian_export'); } catch { return null; }
  });

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [notifications, setNotifications] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [compactView, setCompactView] = useState(false);

  const [workspaceColors, setWorkspaceColors] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('workspace_colors');
      if (saved) return JSON.parse(saved) as Record<string, string>;
    } catch { /* ignore */ }
    return {};
  });

  function updateWorkspaceColor(id: string, color: string) {
    const next = { ...workspaceColors, [id]: color };
    setWorkspaceColors(next);
    try { localStorage.setItem('workspace_colors', JSON.stringify(next)); } catch { /* ignore */ }
  }

  const accentColor = workspaceColors[workspace.id] ?? workspace.color;

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    let correctPw = 'opsdb2026';
    try {
      const custom = localStorage.getItem('ops_custom_password');
      if (custom) correctPw = custom;
    } catch { /* ignore */ }

    if (currentPw !== correctPw) {
      setPwError('Current password is incorrect.');
      return;
    }
    if (newPw.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }

    try {
      localStorage.setItem('ops_custom_password', newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      setPwError('Failed to save password.');
    }
  }

  const sessionLabel = sessionExpiresAt
    ? new Date(sessionExpiresAt).toLocaleDateString('en-AU', { dateStyle: 'medium' })
    : '—';

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 rounded-full transition-colors ${value ? '' : 'bg-[#3A3A3A]'}`}
        style={{ height: '22px', background: value ? accentColor : undefined }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
          style={{ transform: value ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </button>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">App configuration</p>
      </motion.div>

      <div className="space-y-4">
        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Section title="Security">
            <Row label="Session" description={`Active until ${sessionLabel}`}>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-[#A0A0A0] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Lock
              </button>
            </Row>

            <div className="border-t border-[#2A2A2A] pt-4">
              <p className="text-sm text-white mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#6B7280]" />
                Change Password
              </p>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => { setCurrentPw(e.target.value); setPwError(''); }}
                    placeholder="Current password"
                    className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A] pr-10 transition-colors"
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors" tabIndex={-1}>
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                    placeholder="New password (min 6 chars)"
                    className="w-full px-3 py-2 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A] pr-10 transition-colors"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors" tabIndex={-1}>
                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {pwError && <p className="text-xs text-[#EF4444]">{pwError}</p>}
                {pwSuccess && (
                  <p className="text-xs text-[#10B981] flex items-center gap-1">
                    <Check className="w-3 h-3" /> Password updated successfully.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!currentPw || !newPw}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-colors disabled:opacity-40"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Update password
                </button>
              </form>
            </div>
          </Section>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Section title="Preferences">
            <Row label="Notifications" description="Show system notifications and reminders">
              <Toggle value={notifications} onChange={setNotifications} />
            </Row>
            <Row label="Animations" description="Framer Motion transitions">
              <Toggle value={animations} onChange={setAnimations} />
            </Row>
            <Row label="Compact view" description="Reduce spacing in lists and cards">
              <Toggle value={compactView} onChange={setCompactView} />
            </Row>
          </Section>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Section title="Appearance">
            <Row label="Theme" description="Dark mode only">
              <span className="text-xs text-[#6B7280] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" />
                Dark
              </span>
            </Row>
            {WORKSPACES.map(ws => {
              const currentColor = workspaceColors[ws.id] ?? ws.color;
              return (
                <Row key={ws.id} label={`Accent — ${ws.name}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border border-[#3A3A3A] shrink-0"
                      style={{ background: currentColor }}
                    />
                    <span className="text-xs text-[#6B7280] font-mono">{currentColor.toUpperCase()}</span>
                    <input
                      type="color"
                      value={currentColor}
                      onChange={e => updateWorkspaceColor(ws.id, e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                      title={`Pick accent color for ${ws.name}`}
                    />
                  </div>
                </Row>
              );
            })}
          </Section>
        </motion.div>

        {/* Ops OS Sync */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
          <Section title="Ops OS Sync">
            <Row
              label="Export to Obsidian"
              description={`Tasks, projects & contacts as Markdown · ${wsTasks.length} tasks, ${wsProjects.length} projects, ${wsContacts.length} contacts`}
            >
              <button
                onClick={() => {
                  setSyncStatus('syncing');
                  setTimeout(() => {
                    exportToObsidian(wsTasks, wsProjects, wsContacts, workspace.name, workspace.slug);
                    const ts = new Date().toLocaleTimeString('en-AU', { timeStyle: 'short' });
                    setLastExport(ts);
                    try { localStorage.setItem('last_obsidian_export', ts); } catch { /* ignore */ }
                    setSyncStatus('done');
                    setTimeout(() => setSyncStatus('idle'), 3000);
                  }, 600);
                }}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-colors disabled:opacity-50"
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : syncStatus === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {syncStatus === 'syncing' ? 'Exporting…' : syncStatus === 'done' ? 'Exported!' : 'Export .md'}
              </button>
            </Row>
            {lastExport && (
              <Row label="Last export" description={`Today at ${lastExport}`}>
                <span className="flex items-center gap-1 text-xs text-[#10B981]">
                  <CheckCircle2 className="w-3 h-3" /> Synced
                </span>
              </Row>
            )}
            <Row label="Sync format" description="Obsidian Markdown (.md) · one file per workspace">
              <span className="text-xs text-[#6B7280]">v1</span>
            </Row>
          </Section>
        </motion.div>

        {/* Integrations */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.19 }}>
          <Section title="Integrations">
            {googleError && (
              <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Google connection failed. Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in Vercel, then try again.
              </div>
            )}
            <Row
              label="Google"
              description={googleConnected ? 'Account connected — Calendar & Drive access granted' : 'Connect your Google account for Calendar and Drive access'}
            >
              {googleConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-[#10B981]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                  <button
                    onClick={handleGoogleDisconnect}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#2A2A2A] text-[#6B7280] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                  >
                    <Unlink2 className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <a href="/api/auth/google">
                  <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-colors">
                    <Link2 className="w-3.5 h-3.5" />
                    Connect
                  </button>
                </a>
              )}
            </Row>

            {msError && (
              <div className="flex items-center gap-2 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Microsoft connection failed. Check that MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID and MICROSOFT_CLIENT_SECRET are set in Vercel, then try again.
              </div>
            )}
            <Row
              label="Microsoft"
              description={msConnected ? 'Account connected — Entra ID access granted' : 'Connect your Microsoft account for Entra ID access'}
            >
              {msConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-[#10B981]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                  </span>
                  <button
                    onClick={handleMicrosoftDisconnect}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[#2A2A2A] text-[#6B7280] hover:text-[#EF4444] hover:border-[#EF4444]/30 transition-colors"
                  >
                    <Unlink2 className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <a href="/api/auth/microsoft">
                  <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A] transition-colors">
                    <Link2 className="w-3.5 h-3.5" />
                    Connect
                  </button>
                </a>
              )}
            </Row>
          </Section>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <Section title="About">
            <Row label="Version" description="Ops Dashboard">
              <span className="text-xs text-[#6B7280]">1.0.0</span>
            </Row>
            <Row label="Stack" description="Next.js 16 · shadcn/ui · Tailwind · Framer Motion">
              <span className="text-xs text-[#6B7280]">—</span>
            </Row>
            <Row label="Data" description="Client-side · localStorage">
              <span className="text-xs text-[#6B7280]">Local</span>
            </Row>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
