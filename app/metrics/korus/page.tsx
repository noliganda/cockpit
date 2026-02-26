'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from 'recharts';
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
  Activity,
  Zap,
  RefreshCw,
  Bot,
  DollarSign,
  BarChart2,
  GitCompare,
} from 'lucide-react';
import {
  KORUS_APAC_RECRUITMENT,
  KORUS_APAC_OUTREACH,
  KORUS_APAC_ENTITIES,
  KORUS_APAC_DOCUMENTS,
  KORUS_APAC_SYSTEMS,
  KORUS_APAC_TIMELINE,
  type EntityStatus,
  type SystemStatus,
} from '@/lib/korus-metrics-data';

// ── constants ────────────────────────────────────────────────────────────────

const GUEST_SESSION_KEY = 'korus_guest_session';
const GUEST_PASSWORD = 'korus-guest';
const GUEST_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;
const BLUE = '#3B82F6';
const LIME = '#C8FF3D';

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
  sales: '#008080',
  marketing: '#D4A017',
  operations: '#A0A0A0',
};

const CATEGORY_ORDER = [
  'email', 'research', 'admin', 'coordination', 'recruitment',
  'legal', 'creative', 'development', 'finance', 'translation',
  'sales', 'marketing', 'operations',
];

// ── API types ────────────────────────────────────────────────────────────────

type WorkspaceStats = {
  total_actions: number;
  automation_rate: number;
  human_intervention_rate: number;
  avg_duration_minutes: number;
  total_cost_usd: number;
  avg_cost_per_task: number;
  category_breakdown: Record<string, number>;
  top_category: string | null;
  days_active: number;
};

type CategoryRow = {
  category: string;
  count: number;
  avg_duration: number;
};

type DailyVolumeRow = {
  date: string;
  total?: number;
  [key: string]: number | string | undefined;
};

type DailyCostRow = {
  date: string;
  cost: number;
};

type ActionRow = {
  id: string;
  created_at: string;
  category: string;
  description: string;
  outcome?: string;
  duration_minutes?: number;
  human_intervention: boolean;
};

type KorusMetricsResponse = {
  last_updated: string | null;
  summary: {
    total_actions: number;
    automation_rate: number;
    avg_duration_minutes: number;
    human_intervention_rate: number;
    total_cost_usd: number;
  };
  daily_volume: DailyVolumeRow[];
  category_breakdown: CategoryRow[];
  daily_cost: DailyCostRow[];
  intervention_types: Record<string, number>;
  recent_actions: ActionRow[];
  comparison: {
    korus: WorkspaceStats;
    'byron-film': WorkspaceStats;
  };
  generated_at: string;
};

// ── session helpers ──────────────────────────────────────────────────────────

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
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EntityStatus | SystemStatus }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    Active:       { bg: '#10B98120', text: '#10B981' },
    Live:         { bg: '#10B98120', text: '#10B981' },
    Configured:   { bg: '#3B82F620', text: '#3B82F6' },
    'In Progress':{ bg: '#F59E0B20', text: '#F59E0B' },
    Pending:      { bg: '#6B728020', text: '#6B7280' },
  };
  const { bg, text } = cfg[status] ?? { bg: '#6B728020', text: '#6B7280' };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: bg, color: text }}>
      {status}
    </span>
  );
}

function SectionHeader({ icon, title, index }: { icon: React.ReactNode; title: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="flex items-center gap-2 mb-4"
    >
      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${BLUE}20`, color: BLUE }}>
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
      <div className="flex-1 h-px bg-[#2A2A2A]" />
    </motion.div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
  index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  index: number;
}) {
  const color = accent ?? BLUE;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
        <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {sub && <div className="text-xs text-[#6B7280]">{sub}</div>}
    </motion.div>
  );
}

// Automation rate donut ring
function AutomationGauge({ rate }: { rate: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = ((rate < 0 ? 0 : rate > 100 ? 100 : rate) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#2A2A2A" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={BLUE} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="55" y="50" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="inherit">
          {rate}%
        </text>
        <text x="55" y="66" textAnchor="middle" dominantBaseline="middle" fill="#6B7280" fontSize="9" fontFamily="inherit">
          AUTOMATED
        </text>
      </svg>
      <span className="text-xs text-[#A0A0A0]">Automation Rate</span>
    </div>
  );
}

// Horizontal bar (for category breakdown and time-per-task)
function HBar({
  label,
  value,
  max,
  color,
  suffix = '',
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-[#A0A0A0] w-24 shrink-0 truncate capitalize">{label}</span>
      <div className="flex-1 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs text-white font-medium w-10 text-right shrink-0">
        {value}{suffix}
      </span>
    </div>
  );
}

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 shadow-xl text-xs">
      <div className="text-[#A0A0A0] mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-[#A0A0A0] capitalize">{p.name}:</span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function CostTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 shadow-xl text-xs">
      <div className="text-[#A0A0A0] mb-1">{label}</div>
      <div className="text-white font-medium">${payload[0]?.value?.toFixed(4)} USD</div>
    </div>
  );
}

// ── lock screen ──────────────────────────────────────────────────────────────

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
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-white font-bold text-lg" style={{ background: BLUE }}>
            KG
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">KORUS APAC</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Operations Dashboard</p>
        </div>

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
              style={{ background: BLUE }}
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

// ── main dashboard ───────────────────────────────────────────────────────────

function KorusDashboard() {
  const [data, setData] = useState<KorusMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/metrics/korus');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: KorusMetricsResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get all categories present in daily_volume for the stacked bar chart
  const activeCategories = data
    ? [...new Set(
        (data.daily_volume ?? []).flatMap(row =>
          Object.keys(row).filter(k => k !== 'date' && k !== 'total')
        )
      )].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
    : [];

  const maxCatCount = data
    ? Math.max(...(data.category_breakdown ?? []).map(c => c.count), 1)
    : 1;
  const maxAvgDur = data
    ? Math.max(...(data.category_breakdown ?? []).filter(c => c.avg_duration > 0).map(c => c.avg_duration), 1)
    : 1;

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: BLUE }}>
                KG
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">KORUS APAC — Operations Dashboard</h1>
                <p className="text-sm text-[#A0A0A0] mt-0.5">Charlie MoltBot · Operations Coordinator, APAC</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {data?.last_updated && (
                <div className="text-right">
                  <div className="text-xs text-[#6B7280] uppercase tracking-wide">Last updated</div>
                  <div className="text-sm text-white font-medium mt-0.5">{formatUpdated(data.last_updated)}</div>
                </div>
              )}
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="mt-6 h-px w-full" style={{ background: `linear-gradient(to right, ${BLUE}, transparent)` }} />
        </motion.div>

        {/* Error state */}
        {error && (
          <div className="mb-8 bg-[#1A1A1A] border border-[#EF444430] rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <p className="text-sm text-[#EF4444]">Failed to load live data: {error}</p>
            <p className="text-xs text-[#6B7280] ml-auto">Showing static fallback below</p>
          </div>
        )}

        {/* ── Summary KPI Cards ──────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<BarChart2 className="w-3.5 h-3.5" />} title="This Month — Key Metrics" index={0} />

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 h-[120px] animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Total Actions" value={data.summary.total_actions} sub="completed this month" icon={<Zap className="w-4 h-4" />} index={0} />
              <KpiCard label="Automation Rate" value={`${data.summary.automation_rate}%`} sub="no human needed" icon={<Bot className="w-4 h-4" />} accent="#10B981" index={1} />
              <KpiCard label="Avg Duration" value={`${data.summary.avg_duration_minutes}m`} sub="per task" icon={<Clock className="w-4 h-4" />} index={2} />
              <KpiCard label="Human Interventions" value={`${data.summary.human_intervention_rate}%`} sub={`target < 5%`} icon={<Users className="w-4 h-4" />} accent={data.summary.human_intervention_rate <= 5 ? '#10B981' : '#F59E0B'} index={3} />
            </div>
          ) : null}
        </section>

        {/* ── Automation Gauge + Cost Summary ───────────────────────────── */}
        {!loading && data && (
          <section className="mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Gauge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 flex flex-col items-center justify-center gap-2"
              >
                <AutomationGauge rate={data.summary.automation_rate} />
                <p className="text-xs text-center text-[#6B7280] max-w-[180px]">
                  {data.summary.automation_rate >= 95 ? '✓ Excellent — target met' :
                   data.summary.automation_rate >= 80 ? 'Good — approaching target' :
                   'Needs improvement — target 95%+'}
                </p>
              </motion.div>

              {/* Operational Cost */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#F97316' + '20', color: '#F97316' }}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">Operational Cost</span>
                </div>
                <div className="text-2xl font-bold text-white mb-1">${data.summary.total_cost_usd.toFixed(4)}</div>
                <div className="text-xs text-[#6B7280] mb-4">This month (AI/API cost)</div>
                {data.summary.total_actions > 0 && (
                  <div className="pt-3 border-t border-[#2A2A2A]">
                    <div className="text-xs text-[#6B7280] mb-1">Cost per task</div>
                    <div className="text-lg font-semibold text-white">
                      ${(data.summary.total_cost_usd / data.summary.total_actions).toFixed(5)}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${BLUE}20`, color: BLUE }}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide">Security & Quality</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#A0A0A0]">Security Incidents</span>
                    <span className="text-sm font-bold text-[#10B981]">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#A0A0A0]">Human Interventions</span>
                    <span className="text-sm font-bold text-white">{data.summary.human_intervention_rate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#A0A0A0]">Target (interventions)</span>
                    <span className="text-sm text-[#6B7280]">{'< 5%'}</span>
                  </div>
                  <div className="pt-2 border-t border-[#2A2A2A]">
                    {data.summary.human_intervention_rate <= 5 ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        <span className="text-xs text-[#10B981]">Target met</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span className="text-xs text-[#F59E0B]">Above target</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* ── Task Volume Chart ──────────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<BarChart2 className="w-3.5 h-3.5" />} title="Task Volume — Last 30 Days" index={1} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
          >
            {loading ? (
              <div className="h-[220px] animate-pulse bg-[#2A2A2A] rounded-lg" />
            ) : !data?.daily_volume?.length ? (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm text-[#6B7280]">No task data yet — actions will appear here once logged.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.daily_volume} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                  <XAxis dataKey="date" stroke="#3A3A3A" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} />
                  <YAxis stroke="#3A3A3A" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#2A2A2A' }} />
                  {activeCategories.map(cat => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId="a"
                      fill={CATEGORY_COLORS[cat] ?? '#6B7280'}
                      radius={cat === activeCategories[activeCategories.length - 1] ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {activeCategories.map(cat => (
                <span key={cat} className="flex items-center gap-1.5 text-[10px] text-[#A0A0A0]">
                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] ?? '#6B7280' }} />
                  {cat}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Category Breakdown + Time Per Task ────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} title="Category Analysis" index={2} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
            >
              <div className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-4">Volume by Category</div>
              {loading ? (
                <div className="space-y-3">
                  {[0,1,2,3,4].map(i => <div key={i} className="h-6 bg-[#2A2A2A] rounded animate-pulse" />)}
                </div>
              ) : data?.category_breakdown?.length ? (
                <div className="space-y-0.5">
                  {data.category_breakdown.map(row => (
                    <HBar
                      key={row.category}
                      label={row.category}
                      value={row.count}
                      max={maxCatCount}
                      color={CATEGORY_COLORS[row.category] ?? '#6B7280'}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] text-center py-6">No data yet</p>
              )}
            </motion.div>

            {/* Avg time per category */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
            >
              <div className="text-xs font-medium text-[#A0A0A0] uppercase tracking-wide mb-4">Avg Time Per Task (minutes)</div>
              {loading ? (
                <div className="space-y-3">
                  {[0,1,2,3,4].map(i => <div key={i} className="h-6 bg-[#2A2A2A] rounded animate-pulse" />)}
                </div>
              ) : data?.category_breakdown?.filter(r => r.avg_duration > 0).length ? (
                <div className="space-y-0.5">
                  {data.category_breakdown
                    .filter(r => r.avg_duration > 0)
                    .sort((a, b) => b.avg_duration - a.avg_duration)
                    .map(row => (
                      <HBar
                        key={row.category}
                        label={row.category}
                        value={row.avg_duration}
                        max={maxAvgDur}
                        color={CATEGORY_COLORS[row.category] ?? '#6B7280'}
                        suffix="m"
                      />
                    ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] text-center py-6">No duration data yet</p>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── Operational Cost Trend ─────────────────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<DollarSign className="w-3.5 h-3.5" />} title="Operational Cost Trend (30 Days)" index={3} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
          >
            {loading ? (
              <div className="h-[160px] animate-pulse bg-[#2A2A2A] rounded-lg" />
            ) : !data?.daily_cost?.length ? (
              <div className="h-[160px] flex items-center justify-center">
                <p className="text-sm text-[#6B7280]">No cost data yet.</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data.daily_cost} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                    <XAxis dataKey="date" stroke="#3A3A3A" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} />
                    <YAxis stroke="#3A3A3A" tick={{ fill: '#6B7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CostTooltip />} cursor={{ stroke: '#3A3A3A' }} />
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke={BLUE}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: BLUE }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-[#6B7280] mt-2">Daily AI/API cost in USD — actual spend to power Charlie&apos;s operations</p>
              </>
            )}
          </motion.div>
        </section>

        {/* ── Byron Film vs KORUS Comparison ───────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<GitCompare className="w-3.5 h-3.5" />} title="Byron Film vs KORUS — Capability Comparison (Last 90 Days)" index={4} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden"
          >
            {/* Context banner */}
            <div className="px-5 pt-4 pb-3 border-b border-[#2A2A2A]">
              <p className="text-xs text-[#A0A0A0] leading-relaxed">
                <span className="text-white font-medium">Byron Film</span> is Olivier&apos;s video production company where Charlie has{' '}
                <span style={{ color: LIME }} className="font-medium">full Google Workspace + CRM API access</span>.{' '}
                <span className="text-white font-medium">KORUS APAC</span> is currently limited to{' '}
                <span style={{ color: BLUE }} className="font-medium">manual coordination</span> — no programmatic access to KORUS systems yet.
                This shows what becomes possible when Charlie gets proper access.
              </p>
            </div>

            {loading ? (
              <div className="p-5 grid grid-cols-2 gap-4">
                {[0,1].map(i => <div key={i} className="h-48 bg-[#2A2A2A] rounded-lg animate-pulse" />)}
              </div>
            ) : data?.comparison ? (
              <div className="grid grid-cols-2 divide-x divide-[#2A2A2A]">
                {/* Byron Film */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full" style={{ background: LIME }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: LIME }}>Byron Film</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${LIME}20`, color: LIME }}>Full Access</span>
                  </div>
                  <CompareStats stats={data.comparison['byron-film']} accent={LIME} />
                </div>

                {/* KORUS */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full" style={{ background: BLUE }} />
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: BLUE }}>KORUS APAC</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${BLUE}20`, color: BLUE }}>Manual</span>
                  </div>
                  <CompareStats stats={data.comparison.korus} accent={BLUE} />
                </div>
              </div>
            ) : null}

            {/* Unlock potential CTA */}
            {!loading && data && (
              <div className="px-5 py-3 border-t border-[#2A2A2A] bg-[#0F0F0F]">
                <p className="text-xs text-[#6B7280] text-center">
                  Granting Charlie API access to KORUS systems would unlock the same throughput as Byron Film.
                </p>
              </div>
            )}
          </motion.div>
        </section>

        {/* ── Activity Timeline (Supabase live) ─────────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Activity className="w-3.5 h-3.5" />} title="Activity Timeline — Recent 20 Actions" index={5} />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
          >
            {loading ? (
              <div className="space-y-4">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-[#2A2A2A] mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-[#2A2A2A] rounded w-3/4" />
                      <div className="h-2 bg-[#2A2A2A] rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.recent_actions?.length ? (
              <div className="text-center py-8">
                <Zap className="w-5 h-5 text-[#3A3A3A] mx-auto mb-2" />
                <p className="text-sm text-[#6B7280]">No actions logged yet.</p>
                <p className="text-xs text-[#3A3A3A] mt-1">Actions appear here as Charlie works on KORUS tasks.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {data.recent_actions.map((action, i) => {
                  const catColor = CATEGORY_COLORS[action.category] ?? '#6B7280';
                  return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.025 }}
                      className="flex gap-3 py-3 border-b border-[#2A2A2A] last:border-0"
                    >
                      <div className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: i === 0 ? BLUE : catColor }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${i === 0 ? 'text-white font-medium' : 'text-[#A0A0A0]'}`}>
                            {action.description}
                          </p>
                          <span className="text-[10px] text-[#6B7280] shrink-0 mt-0.5">{formatTime(action.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: `${catColor}20`, color: catColor }}
                          >
                            {action.category}
                          </span>
                          {action.duration_minutes ? (
                            <span className="text-[10px] text-[#6B7280]">{action.duration_minutes}m</span>
                          ) : null}
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
            )}
          </motion.div>
        </section>

        {/* ── Operational Status (static fallback) ─────────────────────── */}
        <section className="mb-10">
          <SectionHeader icon={<Users className="w-3.5 h-3.5" />} title="Recruitment Pipeline" index={6} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Sourced', value: KORUS_APAC_RECRUITMENT.totalCandidatesSourced, sub: 'total candidates', icon: <Users className="w-4 h-4" /> },
              { label: 'Contacted', value: KORUS_APAC_RECRUITMENT.candidatesContacted, sub: 'via LinkedIn', icon: <TrendingUp className="w-4 h-4" /> },
              { label: 'Awaiting Reply', value: KORUS_APAC_RECRUITMENT.awaitingResponse, sub: 'pending reply', icon: <Clock className="w-4 h-4" /> },
              { label: 'Interviews', value: KORUS_APAC_RECRUITMENT.interviewsScheduled, sub: 'scheduled', icon: <CheckCircle2 className="w-4 h-4" /> },
            ].map((c, i) => (
              <KpiCard key={c.label} {...c} accent="#008080" index={i} />
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Active Roles</div>
            <div className="flex flex-wrap gap-2">
              {KORUS_APAC_RECRUITMENT.roles.map(role => (
                <span key={role} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: '#00808020', color: '#008080' }}>{role}</span>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mb-10">
          <SectionHeader icon={<TrendingUp className="w-3.5 h-3.5" />} title="Outreach & Business Development" index={7} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Prospects Identified', value: KORUS_APAC_OUTREACH.prospectCompaniesLabel, sub: 'AU market', icon: <Building2 className="w-4 h-4" /> },
              { label: 'InMails Sent', value: KORUS_APAC_OUTREACH.linkedinInMailsSent, sub: 'LinkedIn', icon: <TrendingUp className="w-4 h-4" /> },
              { label: 'Email Campaigns', value: KORUS_APAC_OUTREACH.emailCampaignsActive, sub: 'active', icon: <FileText className="w-4 h-4" /> },
            ].map((c, i) => (
              <KpiCard key={c.label} {...c} accent="#008080" index={i} />
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">Key Targets</div>
            {KORUS_APAC_OUTREACH.keyTargets.map(t => (
              <div key={t.company} className="flex items-center justify-between py-1.5 border-b border-[#2A2A2A] last:border-0">
                <span className="text-sm text-white">{t.company}</span>
                {t.contact && <span className="text-xs text-[#A0A0A0]">{t.contact}</span>}
              </div>
            ))}
          </motion.div>
        </section>

        <section className="mb-10">
          <SectionHeader icon={<Building2 className="w-3.5 h-3.5" />} title="Entity Setup" index={8} />
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            {KORUS_APAC_ENTITIES.map((entity, i) => (
              <div key={entity.label} className={`flex items-center justify-between px-5 py-4 ${i < KORUS_APAC_ENTITIES.length - 1 ? 'border-b border-[#2A2A2A]' : ''}`}>
                <div>
                  <div className="text-sm font-medium text-white">{entity.label}</div>
                  <div className="text-xs text-[#6B7280] mt-0.5">{entity.detail}</div>
                </div>
                <StatusBadge status={entity.status} />
              </div>
            ))}
          </motion.div>
        </section>

        <section className="mb-10">
          <SectionHeader icon={<Cpu className="w-3.5 h-3.5" />} title="Systems & Infrastructure" index={9} />
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            {KORUS_APAC_SYSTEMS.map((sys, i) => (
              <div key={sys.name} className={`flex items-center justify-between px-5 py-4 ${i < KORUS_APAC_SYSTEMS.length - 1 ? 'border-b border-[#2A2A2A]' : ''}`}>
                <div>
                  <div className="text-sm font-medium text-white">{sys.name}</div>
                  {sys.detail && <div className="text-xs text-[#6B7280] mt-0.5">{sys.detail}</div>}
                </div>
                <StatusBadge status={sys.status} />
              </div>
            ))}
          </motion.div>
        </section>

        <section className="mb-12">
          <SectionHeader icon={<Clock className="w-3.5 h-3.5" />} title="Milestone Timeline" index={10} />
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            {KORUS_APAC_TIMELINE.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className="flex gap-4"
              >
                <div className="w-14 shrink-0 text-right">
                  <span className="text-xs font-medium" style={{ color: i === 0 ? BLUE : '#6B7280' }}>{event.date}</span>
                </div>
                <div className="flex flex-col items-center" style={{ minHeight: '48px' }}>
                  <div className="w-2.5 h-2.5 rounded-full mt-0.5 shrink-0" style={{ background: i === 0 ? BLUE : '#2A2A2A', border: `2px solid ${i === 0 ? BLUE : '#3A3A3A'}` }} />
                  {i < KORUS_APAC_TIMELINE.length - 1 && <div className="flex-1 w-px bg-[#2A2A2A] my-1" />}
                </div>
                <div className="pb-5 flex-1">
                  <p className={`text-sm leading-snug ${i === 0 ? 'text-white font-medium' : 'text-[#A0A0A0]'}`}>{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center py-6 border-t border-[#2A2A2A]"
        >
          <p className="text-xs text-[#3A3A3A] uppercase tracking-widest">
            Powered by Charlie APAC · Data updates in real-time
          </p>
          {data?.generated_at && (
            <p className="text-[10px] text-[#2A2A2A] mt-1">{formatUpdated(data.generated_at)}</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ── comparison stats sub-component ──────────────────────────────────────────

function CompareStats({ stats, accent }: { stats: WorkspaceStats | null; accent: string }) {
  if (!stats) {
    return <p className="text-sm text-[#6B7280]">No data yet</p>;
  }

  const rows = [
    { label: 'Total Actions', value: stats.total_actions.toString() },
    { label: 'Days Active', value: stats.days_active.toString() },
    { label: 'Avg / Day', value: stats.days_active > 0 ? (stats.total_actions / stats.days_active).toFixed(1) : '0' },
    { label: 'Automation', value: `${stats.automation_rate}%` },
    { label: 'Avg Duration', value: `${stats.avg_duration_minutes}m` },
    { label: 'Top Category', value: stats.top_category ?? '—' },
  ];

  return (
    <div className="space-y-2.5">
      {rows.map(row => (
        <div key={row.label} className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#6B7280]">{row.label}</span>
          <span className="text-sm font-semibold" style={{ color: accent }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── page root ────────────────────────────────────────────────────────────────

export default function KorusMetricsPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(loadGuestSession());
    setChecked(true);
  }, []);

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
