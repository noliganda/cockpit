'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, LogOut, Eye, EyeOff, Check, Shield, Palette, Bell } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

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

export default function SettingsPage() {
  const { logout, sessionExpiresAt } = useAuth();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [notifications, setNotifications] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [compactView, setCompactView] = useState(false);

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
        className={`relative w-10 h-5.5 rounded-full transition-colors ${value ? 'bg-[#C8FF3D]' : 'bg-[#3A3A3A]'}`}
        style={{ height: '22px' }}
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
            <Row label="Accent — Byron Film">
              <span className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span className="w-4 h-4 rounded-full bg-[#C8FF3D]" />
                Lime (#C8FF3D)
              </span>
            </Row>
            <Row label="Accent — KORUS Group">
              <span className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span className="w-4 h-4 rounded-full bg-[#3B82F6]" />
                Blue (#3B82F6)
              </span>
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
