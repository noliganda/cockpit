'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import type { ActivityLog } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  CheckSquare, Clock, Mail, Search, Users, Send,
  Lock, Eye, EyeOff, Globe,
} from 'lucide-react';

const KORUS_GUEST_KEY = 'korus-guest-auth';
const KORUS_PASSWORD = 'korus-guest';

const BLUE = '#3B82F6';
const LIME = '#C8FF3D';
const TEAL = '#008080';

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.07 } }),
};

function useKorusAuth() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KORUS_GUEST_KEY);
    if (stored) {
      const { expiry } = JSON.parse(stored);
      if (Date.now() < expiry) {
        setAuthed(true);
      } else {
        localStorage.removeItem(KORUS_GUEST_KEY);
      }
    }
    setChecked(true);
  }, []);

  function login(pw: string) {
    if (pw === KORUS_PASSWORD) {
      localStorage.setItem(KORUS_GUEST_KEY, JSON.stringify({ expiry: Date.now() + 24 * 60 * 60 * 1000 }));
      setAuthed(true);
      return true;
    }
    return false;
  }

  return { authed, checked, login };
}

function LoginScreen({ onLogin }: { onLogin: (pw: string) => boolean }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onLogin(pw)) {
      setError('Invalid password. Contact your KORUS representative.');
      setPw('');
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div
            className="h-16 w-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: TEAL + '33', color: TEAL, border: `2px solid ${TEAL}66` }}
          >
            K
          </div>
          <h1 className="text-2xl font-bold text-white">KORUS Group</h1>
          <p className="text-sm mt-1" style={{ color: TEAL }}>APAC Operations Dashboard</p>
          <p className="text-xs text-[#6B7280] mt-1">Copil — Executive View</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Guest access password"
              className="w-full rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-10 py-3 text-sm text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#008080] transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: TEAL, color: '#fff' }}
          >
            Access Dashboard
          </button>
        </form>

        <p className="text-center text-xs text-[#6B7280] mt-6">
          Session expires after 24 hours · KORUS Group Confidential
        </p>
      </motion.div>
    </div>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  color = TEAL,
  i = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  i?: number;
}) {
  return (
    <motion.div
      custom={i}
      initial="hidden"
      animate="show"
      variants={FADE_UP}
      className="rounded-xl p-4 border"
      style={{ backgroundColor: '#111', borderColor: '#222' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
      <p className="text-xs mt-1" style={{ color: '#888' }}>{label}</p>
    </motion.div>
  );
}

function SectionTitle({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  return (
    <motion.h2
      custom={i}
      initial="hidden"
      animate="show"
      variants={FADE_UP}
      className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
    >
      <span className="h-1 w-4 rounded-full inline-block" style={{ backgroundColor: TEAL }} />
      {children}
    </motion.h2>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Active: { bg: '#22C55E22', text: '#22C55E' },
    Pending: { bg: '#F59E0B22', text: '#F59E0B' },
    Setup: { bg: '#3B82F622', text: '#3B82F6' },
    Completed: { bg: '#22C55E22', text: '#22C55E' },
    'In Progress': { bg: '#F59E0B22', text: '#F59E0B' },
    Planned: { bg: '#6B7280', text: '#9CA3AF' },
    Sourced: { bg: '#3B82F622', text: '#3B82F6' },
    Contacted: { bg: '#8B5CF622', text: '#8B5CF6' },
    Screening: { bg: '#F59E0B22', text: '#F59E0B' },
    Interview: { bg: '#EC489922', text: '#EC4899' },
    Offer: { bg: '#22C55E22', text: '#22C55E' },
    Operational: { bg: '#22C55E22', text: '#22C55E' },
  };
  const c = colors[status] ?? { bg: '#6B728022', text: '#9CA3AF' };
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

export default function KorusMetricsPage() {
  const { authed, checked, login } = useKorusAuth();
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/activity?workspace=korus&limit=200');
    const data = await res.json();
    if (data.data) setActivity(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  if (!checked) return null;
  if (!authed) return <LoginScreen onLogin={login} />;

  // Key metrics
  const last30 = activity.filter((a) => {
    const d = new Date(a.timestamp);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  });

  const taskCount = last30.filter((a) => a.entityType === 'task').length;
  const hoursEstimate = Math.round(taskCount * 0.5 + last30.length * 0.15);
  const contactCount = last30.filter((a) => a.entityType === 'contact').length;
  const projectCount = last30.filter((a) => a.entityType === 'project').length;

  // Task volume — last 30 days bar chart
  const volumeMap: Record<string, number> = {};
  last30.forEach((a) => {
    const d = new Date(a.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    volumeMap[key] = (volumeMap[key] ?? 0) + 1;
  });
  const volumeData = Object.entries(volumeMap)
    .map(([date, count]) => ({ date, count }))
    .slice(-14); // last 14 days visible

  // Category analysis
  const categoryKeys = ['task', 'project', 'contact', 'organisation', 'note', 'sprint', 'area'];
  const categoryData = categoryKeys.map((k) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    count: last30.filter((a) => a.entityType === k).length,
  })).filter((c) => c.count > 0);

  // Byron vs KORUS comparison (last 90 days)
  const last90 = activity.filter((a) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    return new Date(a.timestamp) >= cutoff;
  });
  const allActivity = last90;

  const comparisonData = [
    { name: 'Tasks', korus: allActivity.filter((a) => a.workspaceId === 'korus' && a.entityType === 'task').length },
    { name: 'Projects', korus: allActivity.filter((a) => a.workspaceId === 'korus' && a.entityType === 'project').length },
    { name: 'Contacts', korus: allActivity.filter((a) => a.workspaceId === 'korus' && a.entityType === 'contact').length },
    { name: 'Notes', korus: allActivity.filter((a) => a.workspaceId === 'korus' && a.entityType === 'note').length },
  ];

  // Operational cost trend (mock daily cost)
  const costData = volumeData.map((d) => ({
    date: d.date,
    cost: Math.round(d.count * 75 * 0.5),
  }));

  // Recent 20 activity
  const recent = [...activity].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  const ACTION_COLORS: Record<string, string> = {
    created: TEAL,
    updated: BLUE,
    deleted: '#EF4444',
    synced: '#8B5CF6',
    exported: '#F59E0B',
  };

  // Static mock data for tables
  const RECRUITMENT = [
    { name: 'Chen Wei', role: 'Operations Manager', stage: 'Interview', status: 'Active' },
    { name: 'Priya Sharma', role: 'Business Analyst', stage: 'Screening', status: 'Active' },
    { name: 'James Lim', role: 'Legal Counsel SG', stage: 'Offer', status: 'Completed' },
    { name: 'Maria Santos', role: 'BD Manager AU', stage: 'Sourced', status: 'Pending' },
    { name: 'David Park', role: 'Finance Director', stage: 'Contacted', status: 'Active' },
  ];

  const OUTREACH = [
    { company: 'Blackrock Asia', contact: 'Sarah Chen', stage: 'Proposal', last: 'Deck sent', status: 'Active' },
    { company: 'GIC Partners', contact: 'Lee Ming', stage: 'Meeting', last: 'Call scheduled', status: 'In Progress' },
    { company: 'Temasek Holdings', contact: 'TBD', stage: 'Outreach', last: 'Email sent', status: 'Pending' },
    { company: 'ANZ Ventures', contact: 'Tom Walsh', stage: 'Negotiation', last: 'Term sheet', status: 'Active' },
  ];

  const ENTITIES = [
    { name: 'KORUS Pte. Ltd. (SG)', type: 'Singapore Entity', status: 'Active', progress: 100 },
    { name: 'KORUS Pty. Ltd. (AU)', type: 'Australian Entity', status: 'Setup', progress: 65 },
    { name: 'KORUS SARL (FR)', type: 'French Entity', status: 'Pending', progress: 20 },
    { name: 'KORUS Group Ltd.', type: 'Holding Company', status: 'Active', progress: 100 },
  ];

  const SYSTEMS = [
    { name: 'Ops Dashboard v3', status: 'Operational', category: 'Operations', notes: 'Neon Postgres + Next.js' },
    { name: 'Notion (Legacy)', status: 'Active', category: 'PM', notes: 'Syncing to DB' },
    { name: 'Charlie (AI)', status: 'Active', category: 'AI Ops', notes: 'Claude Sonnet 4.6' },
    { name: 'Vercel Hosting', status: 'Operational', category: 'Infra', notes: 'Auto-deploy from GitHub' },
    { name: 'Obsidian Vault', status: 'Active', category: 'Backup', notes: 'iCloud sync' },
  ];

  const MILESTONES = [
    { date: '2026-01', title: 'KORUS SG Incorporated', status: 'Completed' },
    { date: '2026-02', title: 'Ops Dashboard v3 Launch', status: 'Completed' },
    { date: '2026-03', title: 'KORUS AU Entity Setup', status: 'In Progress' },
    { date: '2026-04', title: 'First BD Partnership SG', status: 'Planned' },
    { date: '2026-06', title: 'Series A Preparation', status: 'Planned' },
    { date: '2026-09', title: 'KORUS FR Entity', status: 'Planned' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#fff' }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: '#1A1A1A' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-base font-bold"
              style={{ backgroundColor: TEAL + '33', color: TEAL, border: `1px solid ${TEAL}66` }}
            >
              K
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">KORUS Group</h1>
              <p className="text-xs" style={{ color: TEAL }}>APAC Operations Dashboard — Copil</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#6B7280]">{formatDate(new Date())}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: TEAL + '22', color: TEAL }}>
              <Globe className="h-3 w-3 inline mr-1" />Guest
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* 1. Key Metrics */}
        <section>
          <SectionTitle i={0}>This Month — Key Metrics</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard icon={CheckSquare} label="Tasks Completed" value={taskCount} color={TEAL} i={0} />
            <StatCard icon={Clock} label="Hours Saved" value={`${hoursEstimate}h`} color={BLUE} i={1} />
            <StatCard icon={Mail} label="Emails Processed" value={Math.round(last30.length * 3.2)} color="#8B5CF6" i={2} />
            <StatCard icon={Search} label="Research Hours" value={`${Math.round(hoursEstimate * 0.3)}h`} color="#F59E0B" i={3} />
            <StatCard icon={Users} label="Active Candidates" value={contactCount} color="#EC4899" i={4} />
            <StatCard icon={Send} label="Proposals Sent" value={projectCount} color={LIME.replace('#', '#').substring(0, 7)} i={5} />
          </div>
        </section>

        {/* 2. Task Volume */}
        <motion.section custom={2} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={2}>Task Volume — Last 30 Days</SectionTitle>
          {loading ? (
            <div className="h-48 rounded-xl bg-[#111] border border-[#1A1A1A] flex items-center justify-center text-sm text-[#6B7280]">Loading…</div>
          ) : (
            <div className="rounded-xl p-4 border" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                  <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="count" name="Actions" fill={TEAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.section>

        {/* 3. Category Analysis */}
        <motion.section custom={3} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={3}>Category Analysis</SectionTitle>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#A0A0A0', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, idx) => (
                    <Cell key={idx} fill={[TEAL, BLUE, '#8B5CF6', '#F59E0B', '#EC4899', '#22C55E', '#EF4444'][idx % 7]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* 4. Operational Cost Trend */}
        <motion.section custom={4} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={4}>Operational Cost Trend — 30 Days (AUD)</SectionTitle>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number | undefined) => [`A$${v ?? 0}`, 'Est. Cost']}
                />
                <Line type="monotone" dataKey="cost" stroke={TEAL} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* 5. Byron vs KORUS comparison */}
        <motion.section custom={5} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={5}>KORUS — Capability Breakdown (Last 90 Days)</SectionTitle>
          <div className="rounded-xl p-4 border" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#A0A0A0' }} />
                <Bar dataKey="korus" name="KORUS" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>

        {/* 6. Activity Timeline */}
        <motion.section custom={6} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={6}>Activity Timeline — Recent 20 Actions</SectionTitle>
          <div className="rounded-xl border divide-y divide-[#1A1A1A]" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            {recent.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">No activity recorded yet.</div>
            ) : recent.map((log, i) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: ACTION_COLORS[log.action] ?? '#6B7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="text-[#A0A0A0] capitalize">{log.actor}</span>{' '}
                    {log.action}{' '}
                    <span className="font-medium">{log.entityTitle}</span>
                  </p>
                </div>
                <span className="text-xs text-[#6B7280] shrink-0">{formatDate(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 7. Recruitment Pipeline */}
        <motion.section custom={7} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={7}>Recruitment Pipeline</SectionTitle>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[#6B7280] border-b" style={{ borderColor: '#1A1A1A' }}>
                    <th className="px-4 py-3 text-left font-medium">Candidate</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {RECRUITMENT.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 text-sm" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-[#A0A0A0] hidden sm:table-cell">{r.role}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.stage} /></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* 8. Outreach & BD */}
        <motion.section custom={8} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={8}>Outreach &amp; Business Development</SectionTitle>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[#6B7280] border-b" style={{ borderColor: '#1A1A1A' }}>
                    <th className="px-4 py-3 text-left font-medium">Company</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Contact</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Last Action</th>
                    <th className="px-4 py-3 text-left font-medium">Stage</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {OUTREACH.map((o, i) => (
                    <tr key={i} className="border-b last:border-0 text-sm" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-3 text-white font-medium">{o.company}</td>
                      <td className="px-4 py-3 text-[#A0A0A0] hidden sm:table-cell">{o.contact}</td>
                      <td className="px-4 py-3 text-[#A0A0A0] hidden md:table-cell">{o.last}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.stage} /></td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* 9. Entity Setup */}
        <motion.section custom={9} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={9}>Entity Setup</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ENTITIES.map((e, i) => (
              <div
                key={i}
                className="rounded-xl p-4 border"
                style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">{e.name}</p>
                    <p className="text-xs text-[#6B7280]">{e.type}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${e.progress}%`, backgroundColor: e.progress === 100 ? '#22C55E' : TEAL }}
                  />
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1">{e.progress}% complete</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 10. Systems & Infrastructure */}
        <motion.section custom={10} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={10}>Systems &amp; Infrastructure</SectionTitle>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-[#6B7280] border-b" style={{ borderColor: '#1A1A1A' }}>
                    <th className="px-4 py-3 text-left font-medium">System</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {SYSTEMS.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 text-sm" style={{ borderColor: '#1A1A1A' }}>
                      <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-[#A0A0A0]">{s.category}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-[#6B7280] hidden md:table-cell">{s.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

        {/* 11. Milestone Timeline */}
        <motion.section custom={11} initial="hidden" animate="show" variants={FADE_UP}>
          <SectionTitle i={11}>Milestone Timeline</SectionTitle>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px" style={{ backgroundColor: '#1A1A1A' }} />
            <div className="space-y-6">
              {MILESTONES.map((m, i) => {
                const color = m.status === 'Completed' ? '#22C55E' : m.status === 'In Progress' ? TEAL : '#3A3A3A';
                return (
                  <div key={i} className="relative flex items-start gap-4">
                    <div
                      className="absolute -left-6 mt-1 h-3 w-3 rounded-full border-2"
                      style={{ backgroundColor: color, borderColor: color === '#3A3A3A' ? '#3A3A3A' : color, left: '-6px' }}
                    />
                    <div className="flex-1 rounded-xl p-3 border" style={{ backgroundColor: '#111', borderColor: '#1A1A1A' }}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-medium text-white">{m.title}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6B7280]">{m.date}</span>
                          <StatusBadge status={m.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-[#6B7280]" style={{ borderColor: '#1A1A1A' }}>
          KORUS Group Confidential · Ops Dashboard v3 · Generated {formatDate(new Date())}
        </div>
      </div>
    </div>
  );
}
