'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { MOCK_PROJECTS, KORUS_METRICS } from '@/lib/data';

// ─── types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  workspaceId: string;
  projectId?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'approved';
}

// ─── mock data ────────────────────────────────────────────────────────────────

const MOCK_EXPENSES: Expense[] = [
  // ── Byron Film — Pacific Wellness (proj-1, budget: $12,000) ──────────────
  { id: 'exp-1',  workspaceId: 'byron-film', projectId: 'proj-1', category: 'Equipment', description: 'Camera hire — Sony FX6 (3 days)', amount: 900, date: '2026-02-10', status: 'paid' },
  { id: 'exp-2',  workspaceId: 'byron-film', projectId: 'proj-1', category: 'Crew',      description: 'Crew (3 days × 2 people)', amount: 3600, date: '2026-02-10', status: 'paid' },
  { id: 'exp-3',  workspaceId: 'byron-film', projectId: 'proj-1', category: 'Location',  description: 'Byron Bay studio hire', amount: 500, date: '2026-02-09', status: 'paid' },
  { id: 'exp-4',  workspaceId: 'byron-film', projectId: 'proj-1', category: 'Post',      description: 'Colour grade + sound mix', amount: 1200, date: '2026-02-22', status: 'pending' },
  { id: 'exp-5',  workspaceId: 'byron-film', projectId: 'proj-1', category: 'Music',     description: 'Sync license × 2 tracks', amount: 380, date: '2026-02-08', status: 'paid' },
  { id: 'exp-6',  workspaceId: 'byron-film', projectId: 'proj-1', category: 'Travel',    description: 'Fuel + accommodation', amount: 420, date: '2026-02-10', status: 'paid' },

  // ── Byron Film — Alpine Commercial (proj-2, budget: $18,000) ────────────
  { id: 'exp-7',  workspaceId: 'byron-film', projectId: 'proj-2', category: 'Equipment', description: 'Camera hire — RED Komodo (5 days)', amount: 1500, date: '2026-02-18', status: 'paid' },
  { id: 'exp-8',  workspaceId: 'byron-film', projectId: 'proj-2', category: 'Equipment', description: 'DJI Mavic 3 Cine drone hire', amount: 800, date: '2026-02-18', status: 'paid' },
  { id: 'exp-9',  workspaceId: 'byron-film', projectId: 'proj-2', category: 'Crew',      description: 'Crew (5 days × 3 people)', amount: 7500, date: '2026-02-18', status: 'paid' },
  { id: 'exp-10', workspaceId: 'byron-film', projectId: 'proj-2', category: 'Location',  description: 'National Park permits × 3', amount: 950, date: '2026-02-01', status: 'paid' },
  { id: 'exp-11', workspaceId: 'byron-film', projectId: 'proj-2', category: 'Travel',    description: 'Flights + 4 nights accommodation', amount: 2400, date: '2026-02-17', status: 'paid' },
  { id: 'exp-12', workspaceId: 'byron-film', projectId: 'proj-2', category: 'Post',      description: 'Colour grade (scheduled)', amount: 1800, date: '2026-03-01', status: 'approved' },

  // ── Byron Film — Surf Festival (proj-3, budget: $5,500) ─────────────────
  { id: 'exp-13', workspaceId: 'byron-film', projectId: 'proj-3', category: 'Equipment', description: 'Camera hire (2 days)', amount: 500, date: '2026-01-25', status: 'paid' },
  { id: 'exp-14', workspaceId: 'byron-film', projectId: 'proj-3', category: 'Crew',      description: 'Crew (2 days × 2 people)', amount: 2000, date: '2026-01-25', status: 'paid' },
  { id: 'exp-15', workspaceId: 'byron-film', projectId: 'proj-3', category: 'Travel',    description: 'Fuel + parking', amount: 180, date: '2026-01-25', status: 'paid' },
  { id: 'exp-16', workspaceId: 'byron-film', projectId: 'proj-3', category: 'Post',      description: 'Edit + delivery', amount: 900, date: '2026-02-05', status: 'paid' },
  { id: 'exp-17', workspaceId: 'byron-film', projectId: 'proj-3', category: 'Location',  description: 'Event accreditation', amount: 150, date: '2026-01-24', status: 'paid' },

  // ── KORUS ────────────────────────────────────────────────────────────────
  { id: 'exp-18', workspaceId: 'korus', category: 'SaaS',      description: 'CRM subscription (annual)', amount: 1188, date: '2026-01-01', status: 'paid' },
  { id: 'exp-19', workspaceId: 'korus', category: 'SaaS',      description: 'Project management tools', amount: 480, date: '2026-01-01', status: 'paid' },
  { id: 'exp-20', workspaceId: 'korus', category: 'Marketing', description: 'LinkedIn Ads — Q1 campaign', amount: 2400, date: '2026-01-15', status: 'paid' },
  { id: 'exp-21', workspaceId: 'korus', category: 'Marketing', description: 'Content creation — case studies', amount: 1800, date: '2026-02-01', status: 'paid' },
  { id: 'exp-22', workspaceId: 'korus', category: 'Travel',    description: 'Sydney client meetings (Feb)', amount: 940, date: '2026-02-20', status: 'paid' },
  { id: 'exp-23', workspaceId: 'korus', category: 'Legal',     description: 'Contract review — 3 agreements', amount: 1500, date: '2026-02-10', status: 'paid' },
  { id: 'exp-24', workspaceId: 'korus', category: 'Office',    description: 'Co-working space (3 months)', amount: 1800, date: '2026-01-01', status: 'paid' },
  { id: 'exp-25', workspaceId: 'korus', category: 'SaaS',      description: 'Design tools subscription', amount: 240, date: '2026-02-01', status: 'paid' },
  { id: 'exp-26', workspaceId: 'korus', category: 'Marketing', description: 'Conference sponsorship (Mar)', amount: 3000, date: '2026-03-15', status: 'approved' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number, compact = false): string {
  if (compact && n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

const CATEGORY_COLORS: Record<string, string> = {
  Equipment: '#8B5CF6', Crew: '#3B82F6', Location: '#10B981', Post: '#EC4899',
  Music: '#F97316', Travel: '#F59E0B', SaaS: '#6366F1', Marketing: '#10B981',
  Legal: '#EF4444', Office: '#6B7280',
};

const STATUS_STYLES: Record<string, string> = {
  paid: 'text-[#10B981] bg-[#10B981]/10',
  pending: 'text-[#F59E0B] bg-[#F59E0B]/10',
  approved: 'text-[#3B82F6] bg-[#3B82F6]/10',
};

// ─── main page ────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const isKorus = workspace.slug === 'korus';

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const expenses = useMemo(
    () => MOCK_EXPENSES.filter(e => e.workspaceId === workspace.id),
    [workspace.id],
  );

  const projects = useMemo(
    () => MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id),
    [workspace.id],
  );

  const categories = useMemo(
    () => [...new Set(expenses.map(e => e.category))].sort(),
    [expenses],
  );

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterCategory !== 'all') list = list.filter(e => e.category === filterCategory);
    if (filterStatus !== 'all') list = list.filter(e => e.status === filterStatus);
    return list;
  }, [expenses, filterCategory, filterStatus]);

  const totalSpent = useMemo(() => expenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalPending = useMemo(() => expenses.filter(e => e.status !== 'paid').reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalBudget = useMemo(() => projects.reduce((s, p) => s + (p.budget ?? 0), 0), [projects]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter(e => e.status === 'paid').forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const projectBreakdown = useMemo(() => projects.map(p => {
    const projectExpenses = expenses.filter(e => e.projectId === p.id);
    const spent = projectExpenses.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0);
    const committed = projectExpenses.reduce((s, e) => s + e.amount, 0);
    return { ...p, spent, committed, items: projectExpenses };
  }), [expenses, projects]);

  return (
    <div className="p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-white">Costs</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">
          {isKorus ? 'Operating expenses' : 'Project budgets & expenses'} · {workspace.name}
        </p>
      </motion.div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
        {isKorus ? (
          <>
            <StatCard label="Revenue MTD" value={formatCurrency(KORUS_METRICS.revenue.current)} icon={TrendingUp} color="#10B981"
              sub={`${((KORUS_METRICS.revenue.current / KORUS_METRICS.revenue.previous - 1) * 100).toFixed(0)}% vs last month`} />
            <StatCard label="Total Expenses" value={formatCurrency(totalSpent)} icon={DollarSign} color="#EF4444" sub="paid to date" />
            <StatCard label="Committed" value={formatCurrency(totalPending)} icon={DollarSign} color="#F59E0B" sub="approved / pending" />
            <StatCard label="Net Margin" value={formatCurrency(KORUS_METRICS.revenue.current - totalSpent)} icon={TrendingDown} color={accentColor} sub="revenue minus expenses" />
          </>
        ) : (
          <>
            <StatCard label="Total Budget" value={formatCurrency(totalBudget)} icon={DollarSign} color={accentColor} sub={`across ${projects.length} projects`} />
            <StatCard label="Spent" value={formatCurrency(totalSpent)} icon={TrendingDown} color="#EF4444" sub={`${totalBudget ? Math.round(totalSpent / totalBudget * 100) : 0}% of budget`} />
            <StatCard label="Committed" value={formatCurrency(totalPending)} icon={DollarSign} color="#F59E0B" sub="pending / approved" />
            <StatCard label="Remaining" value={formatCurrency(totalBudget - totalSpent - totalPending)} icon={TrendingUp} color="#10B981" sub="available budget" />
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* ── Project Breakdown (Byron Film) or Category Breakdown (KORUS) ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
        >
          <p className="text-sm font-semibold text-white mb-4">
            {isKorus ? 'Expenses by Category' : 'Budget by Project'}
          </p>

          {isKorus ? (
            <div className="space-y-3">
              {categoryTotals.map(([cat, total]) => {
                const pct = Math.round(total / totalSpent * 100);
                const color = CATEGORY_COLORS[cat] ?? '#6B7280';
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#A0A0A0]">{cat}</span>
                      <span className="text-white font-medium">{formatCurrency(total)} <span className="text-[#6B7280]">{pct}%</span></span>
                    </div>
                    <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {projectBreakdown.map(p => {
                const budget = p.budget ?? 0;
                const spentPct = budget ? Math.min(Math.round(p.spent / budget * 100), 100) : 0;
                const committedPct = budget ? Math.min(Math.round(p.committed / budget * 100), 100) : 0;
                const isOver = p.committed > budget;
                const isExpanded = expandedProject === p.id;

                return (
                  <div key={p.id}>
                    <button
                      onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#A0A0A0] flex items-center gap-1">
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {p.name}
                        </span>
                        <span className="text-white font-medium">
                          {formatCurrency(p.spent)} <span className="text-[#6B7280]">/ {formatCurrency(budget)}</span>
                          {isOver && <span className="ml-1 text-[#EF4444]">OVER</span>}
                        </span>
                      </div>
                      <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden relative">
                        <div className="absolute h-full rounded-full opacity-40" style={{ width: `${committedPct}%`, background: accentColor }} />
                        <div className="absolute h-full rounded-full" style={{ width: `${spentPct}%`, background: isOver ? '#EF4444' : accentColor }} />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 ml-4 space-y-1">
                        {p.items.map(e => (
                          <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-[#2A2A2A] last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[e.category] ?? '#6B7280' }} />
                              <span className="text-[#A0A0A0]">{e.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${STATUS_STYLES[e.status]}`}>{e.status}</span>
                              <span className="text-white font-medium">{formatCurrency(e.amount)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Category Legend ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
        >
          <p className="text-sm font-semibold text-white mb-4">Category Breakdown</p>
          <div className="space-y-2.5">
            {categoryTotals.map(([cat, total]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CATEGORY_COLORS[cat] ?? '#6B7280' }} />
                <span className="text-xs text-[#A0A0A0] flex-1 truncate">{cat}</span>
                <span className="text-xs text-white font-medium">{formatCurrency(total, true)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Expense List ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden"
      >
        {/* List header + filters */}
        <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center gap-3 flex-wrap">
          <p className="text-sm font-semibold text-white mr-auto">All Expenses</p>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="text-xs bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-[#A0A0A0] focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-[#A0A0A0] focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 border-b border-[#2A2A2A] text-[10px] text-[#6B7280] uppercase tracking-wider font-medium">
          <span>Description</span>
          <span>Category</span>
          <span>Date</span>
          <span>Status</span>
          <span className="text-right">Amount</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#6B7280]">No expenses match the selected filters</div>
        ) : (
          filtered.map((e, i) => {
            const projName = e.projectId ? MOCK_PROJECTS.find(p => p.id === e.projectId)?.name : null;
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 border-b border-[#2A2A2A] last:border-0 hover:bg-[#2A2A2A]/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{e.description}</p>
                  {projName && <p className="text-[11px] text-[#6B7280] truncate">{projName}</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: CATEGORY_COLORS[e.category] ?? '#6B7280', background: `${CATEGORY_COLORS[e.category] ?? '#6B7280'}18` }}>
                  {e.category}
                </span>
                <span className="text-xs text-[#6B7280] w-24 text-center">
                  {new Date(e.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_STYLES[e.status]}`}>
                  {e.status}
                </span>
                <span className="text-sm text-white font-medium text-right w-20">
                  {formatCurrency(e.amount)}
                </span>
              </motion.div>
            );
          })
        )}

        {/* Total footer */}
        <div className="px-4 py-3 border-t border-[#3A3A3A] flex items-center justify-between bg-[#222]">
          <span className="text-xs text-[#6B7280]">{filtered.length} expense{filtered.length !== 1 ? 's' : ''}</span>
          <span className="text-sm font-semibold text-white">
            {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#6B7280]">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-[#6B7280] mt-1">{sub}</p>}
    </div>
  );
}
