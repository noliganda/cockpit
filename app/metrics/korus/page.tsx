'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Users,
  Building2,
  FileText,
  Cpu,
  TrendingUp,
  CheckCircle2,
  Clock,
  Circle,
  Activity,
  Zap,
} from 'lucide-react';

// ── Live action types ───────────────────────────────────────────────────────

type LiveAction = {
  id: string;
  created_at: string;
  category: string;
  description: string;
  outcome?: string;
  duration_minutes?: number;
  human_intervention: boolean;
};
import {
  KORUS_APAC_LAST_UPDATED,
  KORUS_APAC_RECRUITMENT,
  KORUS_APAC_OUTREACH,
  KORUS_APAC_ENTITIES,
  KORUS_APAC_DOCUMENTS,
  KORUS_APAC_SYSTEMS,
  KORUS_APAC_TIMELINE,
  type EntityStatus,
  type SystemStatus,
} from '@/lib/korus-metrics-data';

// ─── constants ─────────────────────────────────────────────────────────────

const GUEST_SESSION_KEY = 'korus_guest_session';
const GUEST_PASSWORD = 'korus-guest';
const GUEST_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const TEAL = '#008080';

// ─── helpers ───────────────────────────────────────────────────────────────

function loadGuestSession(): boolean {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (typeof parsed.expires === 'number' && parsed.expires > Date.now()) return true;
    localStorage.removeItem(GUEST_SESSION_KEY);
    return false;
  } catch {
    return false;
  }
}

function saveGuestSession() {
  const expires = Date.now() + GUEST_SESSION_DURATION_MS;
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({ expires }));
}

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── entity / system status badge ──────────────────────────────────────────

function StatusBadge({ status }: { status: EntityStatus | SystemStatus }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    Active: { bg: '#10B98120', text: '#10B981' },
    Live: { bg: '#10B98120', text: '#10B981' },
    Configured: { bg: '#3B82F620', text: '#3B82F6' },
    'In Progress': { bg: '#F59E0B20', text: '#F59E0B' },
    Pending: { bg: '#6B728020', text: '#6B7280' },
  };
  const { bg, text } = cfg[status] ?? { bg: '#6B728020', text: '#6B7280' };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: bg, color: text }}
    >
      {status}
    </span>
  );
}

// ─── stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${TEAL}20`, color: TEAL }}>
          {icon}
        </div>
        <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {sub && <div className="text-xs text-[#6B7280]">{sub}</div>}
    </motion.div>
  );
}

// ─── section header ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title, index }: { icon: React.ReactNode; title: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      className="flex items-center gap-2 mb-4"
    >
      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${TEAL}25`, color: TEAL }}>
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-[#2A2A2A]" />
    </motion.div>
  );
}

// ─── guest lock screen ──────────────────────────────────────────────────────

function GuestLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === GUEST_PASSWORD) {
      saveGuestSession();
      onUnlock();
    } else {
      setError('Incorrect access code.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white font-bold text-lg tracking-tight"
            style={{ background: TEAL }}
          >
            KG
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">KORUS APAC</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Operations Dashboard</p>
        </div>

        {/* Card */}
        <motion.div
          animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm font-medium text-[#A0A0A0]">Guest access required</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter access code"
                autoFocus
                className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder:text-[#6B7280] text-sm focus:outline-none focus:border-[#3A3A3A] pr-11 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-xs text-[#EF4444]"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!password}
              className="w-full py-3 text-white text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40"
              style={{ background: TEAL }}
            >
              Access Dashboard
            </button>
          </form>
        </motion.div>

        <p className="text-center text-[10px] text-[#3A3A3A] mt-6 uppercase tracking-widest">
          KORUS Group — Authorised access only
        </p>
      </motion.div>
    </div>
  );
}

// ─── live activity feed ─────────────────────────────────────────────────────

function LiveActivityFeed() {
  const [actions, setActions] = useState<LiveAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/actions?workspace=korus&limit=15')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(json => {
        if (json?.data) setActions(json.data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <div className="flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 rounded bg-[#2A2A2A]" />
          <div className="h-3 w-32 rounded bg-[#2A2A2A]" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded bg-[#2A2A2A] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 text-center">
        <Zap className="w-5 h-5 text-[#3A3A3A] mx-auto mb-2" />
        <p className="text-xs text-[#6B7280]">No actions logged yet.</p>
        <p className="text-[10px] text-[#3A3A3A] mt-1">POST to /api/actions with workspace=&quot;korus&quot; to populate this feed.</p>
      </div>
    );
  }

  const CATEGORY_COLORS: Record<string, string> = {
    email: '#3B82F6',
    research: '#8B5CF6',
    admin: '#6B7280',
    coordination: '#F59E0B',
    recruitment: '#10B981',
    legal: '#EF4444',
    creative: '#EC4899',
    development: '#6366F1',
    finance: '#F97316',
    translation: '#14B8A6',
    sales: TEAL,
    marketing: '#D4A017',
    operations: '#A0A0A0',
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: TEAL }} />
          <span className="text-sm font-semibold text-white">Live Activity Feed</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#10B98120] text-[#10B981] font-medium">Supabase</span>
        </div>
        <span className="text-xs text-[#6B7280]">{actions.length} recent</span>
      </div>
      <div className="space-y-0">
        {actions.map((action, i) => {
          const catColor = CATEGORY_COLORS[action.category] ?? '#6B7280';
          const date = new Date(action.created_at);
          const dateStr = date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
          const timeStr = date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: i * 0.03 }}
              className="flex gap-3 py-3 border-b border-[#2A2A2A] last:border-0"
            >
              {/* Category dot */}
              <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: i === 0 ? TEAL : catColor }} />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm leading-snug ${i === 0 ? 'text-white font-medium' : 'text-[#A0A0A0]'}`}>
                    {action.description}
                  </p>
                  <span className="text-[10px] text-[#6B7280] shrink-0 mt-0.5">{dateStr} {timeStr}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: `${catColor}20`, color: catColor }}
                  >
                    {action.category}
                  </span>
                  {action.duration_minutes && (
                    <span className="text-[10px] text-[#6B7280]">{action.duration_minutes}m</span>
                  )}
                  {action.human_intervention && (
                    <span className="text-[10px] text-[#F59E0B]">human</span>
                  )}
                  {action.outcome && (
                    <span className="text-[10px] text-[#6B7280] truncate">{action.outcome}</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── timeline dot ──────────────────────────────────────────────────────────

function TimelineDot({ isFirst }: { isFirst: boolean }) {
  if (isFirst) {
    return (
      <div className="relative flex flex-col items-center">
        <div className="w-3 h-3 rounded-full border-2 z-10" style={{ borderColor: TEAL, background: TEAL }} />
        <div className="flex-1 w-px bg-[#2A2A2A] mt-1" />
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center">
      <Circle className="w-3 h-3 text-[#3A3A3A] z-10" fill="#3A3A3A" />
      <div className="flex-1 w-px bg-[#2A2A2A] mt-1" />
    </div>
  );
}

// ─── main dashboard ────────────────────────────────────────────────────────

function KorusDashboard() {
  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ background: TEAL }}
              >
                KG
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">KORUS APAC — Operations Dashboard</h1>
                <p className="text-sm text-[#A0A0A0] mt-0.5">Charlie MoltBot · Operations Coordinator, APAC</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#6B7280] uppercase tracking-wide">Last updated</div>
              <div className="text-sm text-white font-medium mt-0.5">{formatUpdated(KORUS_APAC_LAST_UPDATED)}</div>
            </div>
          </div>

          {/* Teal accent line */}
          <div className="mt-6 h-px w-full" style={{ background: `linear-gradient(to right, ${TEAL}, transparent)` }} />
        </motion.div>

        {/* ── Recruitment Pipeline ──────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="Recruitment Pipeline" index={0} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <StatCard label="Sourced" value={KORUS_APAC_RECRUITMENT.totalCandidatesSourced} sub="total candidates" icon={<Users className="w-4 h-4" />} index={0} />
            <StatCard label="Contacted" value={KORUS_APAC_RECRUITMENT.candidatesContacted} sub="via LinkedIn" icon={<TrendingUp className="w-4 h-4" />} index={1} />
            <StatCard label="Awaiting Response" value={KORUS_APAC_RECRUITMENT.awaitingResponse} sub="pending reply" icon={<Clock className="w-4 h-4" />} index={2} />
            <StatCard label="Interviews Scheduled" value={KORUS_APAC_RECRUITMENT.interviewsScheduled} sub="confirmed" icon={<CheckCircle2 className="w-4 h-4" />} index={3} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.22 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
          >
            <div className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Active Roles</div>
            <div className="flex flex-wrap gap-2">
              {KORUS_APAC_RECRUITMENT.roles.map(role => (
                <span
                  key={role}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: `${TEAL}20`, color: TEAL }}
                >
                  {role}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Outreach & Business Development ──────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Outreach & Business Development" index={1} />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
            <StatCard label="Prospects Identified" value={KORUS_APAC_OUTREACH.prospectCompaniesLabel} sub="AU market" icon={<Building2 className="w-4 h-4" />} index={0} />
            <StatCard label="InMails Sent" value={KORUS_APAC_OUTREACH.linkedinInMailsSent} sub="LinkedIn" icon={<TrendingUp className="w-4 h-4" />} index={1} />
            <StatCard label="Email Campaigns" value={KORUS_APAC_OUTREACH.emailCampaignsActive} sub="active" icon={<FileText className="w-4 h-4" />} index={2} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
          >
            <div className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Key Targets</div>
            <div className="space-y-2">
              {KORUS_APAC_OUTREACH.keyTargets.map(t => (
                <div key={t.company} className="flex items-center justify-between">
                  <span className="text-sm text-white">{t.company}</span>
                  {t.contact && (
                    <span className="text-xs text-[#A0A0A0]">{t.contact}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Entity Setup ──────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Building2 className="w-3.5 h-3.5" />} title="Entity Setup" index={2} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden"
          >
            {KORUS_APAC_ENTITIES.map((entity, i) => (
              <div
                key={entity.label}
                className={`flex items-center justify-between px-5 py-4 ${i < KORUS_APAC_ENTITIES.length - 1 ? 'border-b border-[#2A2A2A]' : ''}`}
              >
                <div>
                  <div className="text-sm font-medium text-white">{entity.label}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{entity.detail}</div>
                </div>
                <StatusBadge status={entity.status} />
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Documents & Admin ──────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<FileText className="w-3.5 h-3.5" />} title="Documents & Admin" index={3} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Translated" value={KORUS_APAC_DOCUMENTS.translated} sub={KORUS_APAC_DOCUMENTS.translatedDetail} icon={<FileText className="w-4 h-4" />} index={0} />
            <StatCard label="Business Plan" value={KORUS_APAC_DOCUMENTS.businessPlan} icon={<FileText className="w-4 h-4" />} index={1} />
            <StatCard label="Financial Model" value={KORUS_APAC_DOCUMENTS.financialModel} icon={<TrendingUp className="w-4 h-4" />} index={2} />
            <StatCard label="Case Studies" value={KORUS_APAC_DOCUMENTS.competitorCaseStudies} sub="competitors analysed" icon={<CheckCircle2 className="w-4 h-4" />} index={3} />
          </div>
        </section>

        {/* ── Systems & Infrastructure ───────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Cpu className="w-3.5 h-3.5" />} title="Systems & Infrastructure" index={4} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden"
          >
            {KORUS_APAC_SYSTEMS.map((sys, i) => (
              <div
                key={sys.name}
                className={`flex items-center justify-between px-5 py-4 ${i < KORUS_APAC_SYSTEMS.length - 1 ? 'border-b border-[#2A2A2A]' : ''}`}
              >
                <div>
                  <div className="text-sm font-medium text-white">{sys.name}</div>
                  {sys.detail && <div className="text-xs text-[#6B7280] mt-0.5">{sys.detail}</div>}
                </div>
                <StatusBadge status={sys.status} />
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Live Activity Feed (Supabase) ─────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} title="Live Activity Feed" index={6} />
          <LiveActivityFeed />
        </section>

        {/* ── Activity Timeline ─────────────────────────────── */}
        <section className="mb-12">
          <SectionHeader icon={<Clock className="w-3.5 h-3.5" />} title="Activity Timeline" index={5} />

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="space-y-0">
              {KORUS_APAC_TIMELINE.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="flex gap-4"
                >
                  {/* Left: date */}
                  <div className="w-14 shrink-0 text-right">
                    <span className="text-xs font-medium" style={{ color: i === 0 ? TEAL : '#6B7280' }}>{event.date}</span>
                  </div>

                  {/* Center: dot + line */}
                  <div className="flex flex-col items-center" style={{ minHeight: '48px' }}>
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0"
                      style={{
                        background: i === 0 ? TEAL : '#2A2A2A',
                        border: `2px solid ${i === 0 ? TEAL : '#3A3A3A'}`,
                      }}
                    />
                    {i < KORUS_APAC_TIMELINE.length - 1 && (
                      <div className="flex-1 w-px bg-[#2A2A2A] my-1" />
                    )}
                  </div>

                  {/* Right: description */}
                  <div className="pb-5 flex-1">
                    <p className={`text-sm leading-snug ${i === 0 ? 'text-white font-medium' : 'text-[#A0A0A0]'}`}>
                      {event.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="text-center py-6 border-t border-[#2A2A2A]"
        >
          <p className="text-xs text-[#3A3A3A] uppercase tracking-widest">
            Powered by Charlie MoltBot — KORUS Group APAC Operations
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── page root ─────────────────────────────────────────────────────────────

export default function KorusMetricsPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(loadGuestSession());
    setChecked(true);
  }, []);

  // Render as a full-screen overlay to cover sidebar from root layout
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0F0F0F] overflow-y-auto">
      {!checked ? null : !authed ? (
        <GuestLockScreen onUnlock={() => setAuthed(true)} />
      ) : (
        <KorusDashboard />
      )}
    </div>
  );
}
