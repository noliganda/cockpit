'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Sun, AlertCircle, ArrowRight, TrendingUp, FolderOpen,
  CheckSquare, Clock, Users, DollarSign, Target,
} from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { MOCK_PROJECTS, MOCK_CONTACTS, KORUS_METRICS } from '@/lib/data';
import { BYRON_FILM_STATUSES, KORUS_STATUSES } from '@/types';

// ─── constants ────────────────────────────────────────────────────────────────

// Fixed reference date matching mock data (Feb 25, 2026)
const MOCK_TODAY = '2026-02-25';
const MOCK_PLUS7 = '2026-03-04';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444', high: '#F59E0B', medium: '#3B82F6', low: '#6B7280',
};
const TERMINAL_STATUSES = new Set(['paid', 'won', 'delivered', 'lost']);

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function formatDue(dateStr: string): string {
  if (dateStr === MOCK_TODAY) return 'Today';
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date(MOCK_TODAY).getTime()) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 1) return 'Tomorrow';
  return `${diff}d`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string;
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

function SectionHeader({ icon: Icon, title, href }: { icon: React.ElementType; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#6B7280]" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-white transition-colors">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const { workspace } = useWorkspace();
  const { tasks: allTasks } = useTaskStore();
  const accentColor = getWorkspaceColor(workspace.id);
  const isKorus = workspace.slug === 'korus';

  const tasks = useMemo(
    () => allTasks.filter(t => t.workspaceId === workspace.id),
    [allTasks, workspace.id],
  );

  const activeTasks = useMemo(
    () => tasks.filter(t => !TERMINAL_STATUSES.has(t.status)),
    [tasks],
  );

  const overdueTasks = useMemo(
    () => activeTasks.filter(t => t.dueDate && t.dueDate < MOCK_TODAY),
    [activeTasks],
  );

  const priorityTasks = useMemo(
    () => activeTasks
      .filter(t =>
        (t.dueDate && t.dueDate >= MOCK_TODAY && t.dueDate <= MOCK_PLUS7) ||
        t.priority === 'urgent'
      )
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]),
    [activeTasks],
  );

  const projects = useMemo(
    () => MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id && p.status === 'active'),
    [workspace.id],
  );

  const contacts = useMemo(
    () => MOCK_CONTACTS.filter(c => c.workspaceId === workspace.id),
    [workspace.id],
  );

  // Greeting based on real clock
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date(MOCK_TODAY).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── stats ──
  const stats = isKorus
    ? [
        { label: 'Revenue MTD', value: formatCurrency(KORUS_METRICS.revenue.current), sub: 'vs ' + formatCurrency(KORUS_METRICS.revenue.previous) + ' prev', icon: DollarSign, color: '#3B82F6' },
        { label: 'Active Leads', value: KORUS_METRICS.leads.active, sub: `${KORUS_METRICS.leads.qualified} qualified`, icon: Users, color: '#8B5CF6' },
        { label: 'Deals Won (Q1)', value: KORUS_METRICS.wonDeals.count, sub: formatCurrency(KORUS_METRICS.wonDeals.value), icon: Target, color: '#10B981' },
        { label: 'Overdue Tasks', value: overdueTasks.length, sub: overdueTasks.length > 0 ? 'Needs attention' : 'All clear', icon: AlertCircle, color: overdueTasks.length > 0 ? '#EF4444' : '#10B981' },
      ]
    : [
        { label: 'Active Projects', value: projects.length, sub: `${MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id).length} total`, icon: FolderOpen, color: '#C8FF3D' },
        { label: 'Due This Week', value: priorityTasks.length, sub: 'tasks requiring focus', icon: Clock, color: '#F59E0B' },
        { label: 'In Production', value: tasks.filter(t => t.status === 'in-prod').length, sub: 'active shoots', icon: CheckSquare, color: '#8B5CF6' },
        { label: 'Overdue', value: overdueTasks.length, sub: overdueTasks.length > 0 ? 'Needs attention' : 'All clear', icon: AlertCircle, color: overdueTasks.length > 0 ? '#EF4444' : '#10B981' },
      ];

  // ── pipeline / production snapshot ──
  const statuses = isKorus ? KORUS_STATUSES : BYRON_FILM_STATUSES;
  const snapshotLabel = isKorus ? 'Pipeline Snapshot' : 'Production Snapshot';
  const snapshot = statuses.map(s => ({
    ...s,
    count: tasks.filter(t => t.status === s.id).length,
  })).filter(s => s.count > 0);

  return (
    <div className="p-6 max-w-4xl">
      {/* ── Greeting ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-7 flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-5 h-5" style={{ color: accentColor }} />
            <h1 className="text-2xl font-bold text-white">{greeting}, Charlie</h1>
          </div>
          <p className="text-sm text-[#A0A0A0]">{dateLabel} · {workspace.name}</p>
        </div>
        {overdueTasks.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'}
          </div>
        )}
      </motion.div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Focus + Overdue ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Today's Focus */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
        >
          <SectionHeader icon={Target} title="Today's Focus" href="/tasks" />
          {priorityTasks.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-4 text-center">No urgent tasks this week</p>
          ) : (
            <div className="space-y-2">
              {priorityTasks.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                  <span
                    className="shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ background: PRIORITY_COLORS[t.priority] }}
                  />
                  <p className="text-sm text-white flex-1 truncate">{t.title}</p>
                  {t.dueDate && (
                    <span
                      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        color: t.dueDate === MOCK_TODAY ? '#F59E0B' : '#A0A0A0',
                        background: t.dueDate === MOCK_TODAY ? '#F59E0B18' : '#2A2A2A',
                      }}
                    >
                      {formatDue(t.dueDate)}
                    </span>
                  )}
                </div>
              ))}
              {priorityTasks.length > 5 && (
                <Link href="/tasks" className="text-xs text-[#6B7280] hover:text-white transition-colors">
                  +{priorityTasks.length - 5} more tasks
                </Link>
              )}
            </div>
          )}
        </motion.div>

        {/* Overdue Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
          style={{ borderColor: overdueTasks.length > 0 ? '#EF444430' : '#2A2A2A' }}
        >
          <SectionHeader icon={AlertCircle} title="Overdue" href="/tasks" />
          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-2">
                <CheckSquare className="w-4 h-4 text-[#10B981]" />
              </div>
              <p className="text-sm text-[#10B981] font-medium">All clear!</p>
              <p className="text-xs text-[#6B7280] mt-0.5">No overdue tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#EF4444]" />
                  <p className="text-sm text-white flex-1 truncate">{t.title}</p>
                  {t.dueDate && (
                    <span className="shrink-0 text-[10px] text-[#EF4444] bg-[#EF4444]/10 px-1.5 py-0.5 rounded-full font-medium">
                      {formatDue(t.dueDate)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Active Projects ──────────────────────────────────────── */}
      {projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-4"
        >
          <SectionHeader icon={FolderOpen} title="Active Projects" href="/projects" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {projects.map(p => {
              const taskCount = tasks.filter(t => t.projectId === p.id).length;
              const daysLeft = p.endDate
                ? Math.ceil((new Date(p.endDate).getTime() - new Date(MOCK_TODAY).getTime()) / 86400000)
                : null;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="p-3 rounded-lg border border-[#2A2A2A] hover:border-[#3A3A3A] hover:bg-[#222] transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accentColor }} />
                      <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                      {taskCount > 0 && <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>}
                      {daysLeft !== null && (
                        <span className={daysLeft <= 7 ? 'text-[#F59E0B]' : ''}>
                          {daysLeft > 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d over`}
                        </span>
                      )}
                      {p.budget && <span className="ml-auto">{formatCurrency(p.budget)}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Pipeline / Production Snapshot ──────────────────────── */}
      {snapshot.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 mb-4"
        >
          <SectionHeader icon={TrendingUp} title={snapshotLabel} href="/tasks/kanban" />
          <div className="flex flex-wrap gap-2">
            {snapshot.map(s => (
              <div
                key={s.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm"
                style={{ borderColor: `${s.color}30`, background: `${s.color}12` }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-white font-medium">{s.count}</span>
                <span style={{ color: s.color }}>{s.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Contacts / Leads (KORUS) ─────────────────────────────── */}
      {isKorus && contacts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
        >
          <SectionHeader icon={Users} title="Active Contacts" href="/crm" />
          <div className="space-y-2">
            {contacts
              .filter(c => !['won', 'lost'].includes(c.pipelineStage ?? ''))
              .slice(0, 4)
              .map(c => {
                const stageColor = {
                  lead: '#6B7280', qualification: '#8B5CF6', proposal: '#F59E0B', negotiation: '#3B82F6',
                }[c.pipelineStage ?? ''] ?? '#6B7280';
                return (
                  <Link key={c.id} href={`/crm/${c.id}`}>
                    <div className="flex items-center gap-3 py-1.5 hover:bg-[#222] rounded-lg px-1 transition-colors">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${stageColor}20`, color: stageColor }}
                      >
                        {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{c.name}</p>
                        <p className="text-xs text-[#6B7280] truncate">{c.company}</p>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium shrink-0"
                        style={{ color: stageColor, background: `${stageColor}20` }}
                      >
                        {c.pipelineStage}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
