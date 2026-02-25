'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { format } from 'date-fns';

// ── Mock data ─────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  workspace: 'byron-film' | 'korus' | 'personal';
  date: string;
  category: string;
  description: string;
  amount: number;
  recurring?: boolean;
}

interface Budget {
  workspace: 'byron-film' | 'korus' | 'personal';
  label: string;
  allocated: number;
  spent: number;
  color: string;
}

const BUDGETS: Budget[] = [
  // Byron Film — project budgets
  { workspace: 'byron-film', label: 'Endota Spa Campaign', allocated: 12000, spent: 4800, color: '#D4A017' },
  { workspace: 'byron-film', label: 'hire.byronfilm.com', allocated: 5000, spent: 2100, color: '#F59E0B' },
  { workspace: 'byron-film', label: 'Vimeo → YouTube Migration', allocated: 800, spent: 210, color: '#3B82F6' },
  { workspace: 'byron-film', label: 'Content Engine (Q1)', allocated: 3000, spent: 890, color: '#8B5CF6' },
  { workspace: 'byron-film', label: 'Strange Attractor', allocated: 18000, spent: 6500, color: '#EC4899' },
  // KORUS — cost centres
  { workspace: 'korus', label: 'KORUS AU Setup', allocated: 15000, spent: 8200, color: '#008080' },
  { workspace: 'korus', label: 'KORUS Recruitment', allocated: 20000, spent: 11400, color: '#0EA5E9' },
  { workspace: 'korus', label: 'Singapore Operations', allocated: 10000, spent: 3100, color: '#6366F1' },
  // Personal — infra/ops
  { workspace: 'personal', label: 'AI API Budget (monthly)', allocated: 300, spent: 189, color: '#F97316' },
  { workspace: 'personal', label: 'SaaS / Subscriptions', allocated: 200, spent: 142, color: '#10B981' },
];

const EXPENSES: Expense[] = [
  // Byron Film
  { id: 'e1', workspace: 'byron-film', date: '2026-02-20', category: 'Equipment', description: 'Endota Spa — camera & lighting hire', amount: 1200 },
  { id: 'e2', workspace: 'byron-film', date: '2026-02-18', category: 'Crew', description: 'Strange Attractor — DP day rate', amount: 1800 },
  { id: 'e3', workspace: 'byron-film', date: '2026-02-15', category: 'Crew', description: 'Strange Attractor — sound recordist', amount: 900 },
  { id: 'e4', workspace: 'byron-film', date: '2026-02-12', category: 'Software', description: 'Adobe Creative Cloud (monthly)', amount: 89, recurring: true },
  { id: 'e5', workspace: 'byron-film', date: '2026-02-10', category: 'Software', description: 'Webflow — byronfilm.com plan', amount: 40, recurring: true },
  { id: 'e6', workspace: 'byron-film', date: '2026-02-08', category: 'Development', description: 'hire.byronfilm.com — Shopify dev', amount: 890 },
  { id: 'e7', workspace: 'byron-film', date: '2026-02-05', category: 'Equipment', description: 'Endota Spa — props & styling', amount: 340 },
  { id: 'e8', workspace: 'byron-film', date: '2026-02-01', category: 'Travel', description: 'Endota Spa — location scouting (mileage)', amount: 95 },
  { id: 'e9', workspace: 'byron-film', date: '2026-01-28', category: 'Software', description: 'Frame.io — review platform (monthly)', amount: 45, recurring: true },
  { id: 'e10', workspace: 'byron-film', date: '2026-01-20', category: 'Equipment', description: 'Strange Attractor — equipment transport', amount: 280 },
  // KORUS
  { id: 'e11', workspace: 'korus', date: '2026-02-22', category: 'Legal', description: 'ASIC registration — AU Pty Ltd', amount: 1200 },
  { id: 'e12', workspace: 'korus', date: '2026-02-18', category: 'Recruitment', description: 'Thomas Choulot — final payment', amount: 4000 },
  { id: 'e13', workspace: 'korus', date: '2026-02-15', category: 'Travel', description: 'Singapore trip — flights + hotel', amount: 2400 },
  { id: 'e14', workspace: 'korus', date: '2026-02-12', category: 'Software', description: 'Microsoft 365 E3 — 3 seats', amount: 120, recurring: true },
  { id: 'e15', workspace: 'korus', date: '2026-02-10', category: 'Legal', description: 'Business plan legal review', amount: 800 },
  { id: 'e16', workspace: 'korus', date: '2026-02-05', category: 'Recruitment', description: 'LinkedIn Recruiter — job post', amount: 380 },
  { id: 'e17', workspace: 'korus', date: '2026-02-01', category: 'Infrastructure', description: 'VPS — Microsoft Azure (monthly)', amount: 50, recurring: true },
  { id: 'e18', workspace: 'korus', date: '2026-01-25', category: 'Travel', description: 'CBRE meeting — business transport', amount: 85 },
  // Personal
  { id: 'e19', workspace: 'personal', date: '2026-02-20', category: 'AI / API', description: 'Anthropic API — Claude usage', amount: 89, recurring: true },
  { id: 'e20', workspace: 'personal', date: '2026-02-18', category: 'Infrastructure', description: 'Tailscale Business (monthly)', amount: 10, recurring: true },
  { id: 'e21', workspace: 'personal', date: '2026-02-15', category: 'AI / API', description: 'OpenAI API — GPT-4 usage', amount: 25, recurring: true },
  { id: 'e22', workspace: 'personal', date: '2026-02-12', category: 'Infrastructure', description: 'GitHub Team (monthly)', amount: 12, recurring: true },
  { id: 'e23', workspace: 'personal', date: '2026-02-10', category: 'Infrastructure', description: 'Cloudflare Pro (monthly)', amount: 20, recurring: true },
  { id: 'e24', workspace: 'personal', date: '2026-02-05', category: 'Software', description: 'Obsidian Sync (annual ÷ 12)', amount: 8, recurring: true },
  { id: 'e25', workspace: 'personal', date: '2026-02-01', category: 'AI / API', description: 'Perplexity Pro (monthly)', amount: 20, recurring: true },
];

const WORKSPACE_COLORS: Record<string, string> = {
  'byron-film': '#D4A017',
  'korus': '#008080',
  'personal': '#F97316',
};

const WORKSPACE_LABELS: Record<string, string> = {
  'byron-film': 'Byron Film',
  'korus': 'KORUS Group',
  'personal': 'Personal',
};

const ALL_CATEGORIES = Array.from(new Set(EXPENSES.map(e => e.category))).sort();

// ── Component ─────────────────────────────────────────────────────────────────

export default function CostsPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  const [wsFilter, setWsFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  const wsFilterEffective = wsFilter === 'all' ? null : wsFilter;

  const filteredExpenses = useMemo(() => {
    return EXPENSES.filter(e => {
      if (wsFilterEffective && e.workspace !== wsFilterEffective) return false;
      if (catFilter !== 'all' && e.category !== catFilter) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [wsFilterEffective, catFilter]);

  const filteredBudgets = useMemo(() => {
    return BUDGETS.filter(b => !wsFilterEffective || b.workspace === wsFilterEffective);
  }, [wsFilterEffective]);

  const totalSpend = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const totalAllocated = useMemo(() => filteredBudgets.reduce((s, b) => s + b.allocated, 0), [filteredBudgets]);
  const totalBudgeted = useMemo(() => filteredBudgets.reduce((s, b) => s + b.spent, 0), [filteredBudgets]);
  const recurringTotal = useMemo(() => filteredExpenses.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const topCategory = categoryTotals[0];

  function fmt(n: number) {
    return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
  }

  return (
    <div className="p-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-xl font-bold text-white">Costs</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">Project budgets and operational expenses</p>
      </motion.div>

      {/* Workspace filter */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'byron-film', 'korus', 'personal'] as const).map(w => (
          <button
            key={w}
            onClick={() => setWsFilter(w)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              wsFilter === w
                ? 'text-black border-transparent'
                : 'text-[#A0A0A0] border-[#2A2A2A] hover:text-white hover:border-[#3A3A3A]'
            }`}
            style={wsFilter === w ? { background: w === 'all' ? accentColor : WORKSPACE_COLORS[w] } : undefined}
          >
            {w === 'all' ? 'All workspaces' : WORKSPACE_LABELS[w]}
          </button>
        ))}
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Expenses', value: fmt(totalSpend), sub: `${filteredExpenses.length} transactions`, icon: <DollarSign className="w-4 h-4" /> },
          { label: 'Budget Spent', value: fmt(totalBudgeted), sub: `of ${fmt(totalAllocated)} allocated`, icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Recurring / mo', value: fmt(recurringTotal), sub: 'subscriptions & retainers', icon: <TrendingDown className="w-4 h-4" /> },
          { label: 'Top Category', value: topCategory?.[0] ?? '—', sub: topCategory ? fmt(topCategory[1]) : '', icon: <Filter className="w-4 h-4" /> },
        ].map((card, i) => (
          <div key={card.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#6B7280]">{card.label}</span>
              <span style={{ color: accentColor }}>{card.icon}</span>
            </div>
            <p className="text-lg font-bold text-white">{card.value}</p>
            <p className="text-xs text-[#6B7280] mt-0.5">{card.sub}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget bars */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4">Budgets</h2>
          {filteredBudgets.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-4 text-center">No budgets for this view</p>
          ) : (
            <div className="space-y-4">
              {filteredBudgets.map(b => {
                const pct = Math.min(100, Math.round((b.spent / b.allocated) * 100));
                const over = b.spent > b.allocated;
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: WORKSPACE_COLORS[b.workspace] }} />
                        <span className="text-xs text-white truncate">{b.label}</span>
                      </div>
                      <span className={`text-[10px] shrink-0 ml-2 ${over ? 'text-[#EF4444]' : 'text-[#6B7280]'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: over ? '#EF4444' : b.color }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-[#6B7280]">{fmt(b.spent)} spent</span>
                      <span className="text-[10px] text-[#6B7280]">{fmt(b.allocated)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Category breakdown */}
          {categoryTotals.length > 0 && (
            <div className="mt-6 pt-4 border-t border-[#2A2A2A]">
              <h3 className="text-xs font-semibold text-[#A0A0A0] mb-3">By Category</h3>
              <div className="space-y-2">
                {categoryTotals.map(([cat, total]) => {
                  const pct = totalSpend > 0 ? Math.round((total / totalSpend) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-[#A0A0A0]">{cat}</span>
                        <span className="text-[10px] text-white">{fmt(total)}</span>
                      </div>
                      <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accentColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Expense table */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="lg:col-span-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden"
        >
          {/* Table header + category filter */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A2A]">
            <h2 className="text-sm font-semibold text-white">Expenses</h2>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              className="text-xs bg-[#0F0F0F] border border-[#2A2A2A] text-[#A0A0A0] rounded-lg px-2 py-1 focus:outline-none focus:border-[#3A3A3A]"
            >
              <option value="all">All categories</option>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="overflow-auto max-h-[520px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A]">
                <tr>
                  <th className="text-left text-[10px] font-semibold text-[#6B7280] px-5 py-2.5 uppercase tracking-wide">Date</th>
                  <th className="text-left text-[10px] font-semibold text-[#6B7280] px-3 py-2.5 uppercase tracking-wide">Category</th>
                  <th className="text-left text-[10px] font-semibold text-[#6B7280] px-3 py-2.5 uppercase tracking-wide">Description</th>
                  <th className="text-right text-[10px] font-semibold text-[#6B7280] px-5 py-2.5 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="border-b border-[#1F1F1F] hover:bg-[#2A2A2A]/40 transition-colors">
                    <td className="px-5 py-2.5 text-[#6B7280] whitespace-nowrap">{format(new Date(e.date), 'dd MMM')}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2A2A2A] text-[#A0A0A0]">{e.category}</span>
                    </td>
                    <td className="px-3 py-2.5 text-white">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{e.description}</span>
                        {e.recurring && (
                          <span className="text-[9px] text-[#6B7280] bg-[#2A2A2A] px-1 py-0.5 rounded shrink-0">↻</span>
                        )}
                        {wsFilter === 'all' && (
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: WORKSPACE_COLORS[e.workspace] }} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right text-white font-medium">{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#1A1A1A] border-t border-[#2A2A2A]">
                <tr>
                  <td colSpan={3} className="px-5 py-2.5 text-xs font-semibold text-[#A0A0A0]">Total ({filteredExpenses.length} items)</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-white">{fmt(totalSpend)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
