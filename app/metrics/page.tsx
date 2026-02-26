'use client';

import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, FolderOpen, Users, Timer, TrendingUp, BarChart3, ArrowRight, Zap, DollarSign, Bot, Activity } from 'lucide-react';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { useSprintStore } from '@/stores/sprint-store';
import { useContactStore } from '@/stores/contact-store';
import { getTaskStatusesForWorkspace, getTerminalStatusIds, getPipelineForWorkspace } from '@/types';
import Link from 'next/link';
import { format, subDays, isAfter } from 'date-fns';

// ── Supabase metrics types ─────────────────────────────────────────────────

type LiveMetrics = {
  total_actions: number;
  total_duration_minutes: number;
  avg_duration_minutes: number;
  total_api_cost_usd: number;
  total_api_tokens: number;
  human_interventions: number;
  automation_rate: number;
  category_breakdown: Record<string, number>;
  recent_actions: Array<{ id: string; created_at: string; category: string; description: string; workspace: string }>;
};

type CompareMetrics = {
  workspaces: Record<string, {
    workspace: string;
    total_actions: number;
    automation_rate: number;
    total_api_cost_usd: number;
    top_category: string | null;
  } | null>;
};

// ── Mini stat card ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color, index,
}: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#6B7280]">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

function HBar({ label, value, max, color, count }: { label: string; value: number; max: number; color: string; count: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
          <span className="text-xs text-[#A0A0A0]">{label}</span>
        </div>
        <span className="text-xs text-white">{count}</span>
      </div>
      <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  // ── Live Supabase metrics ──────────────────────────────────────────────
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [compareMetrics, setCompareMetrics] = useState<CompareMetrics | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);

  useEffect(() => {
    setLiveLoading(true);
    const wsParam = workspace.id === 'byron-film' ? 'byron-film' : workspace.id === 'korus' ? 'korus' : 'personal';
    Promise.all([
      fetch(`/api/metrics?workspace=${wsParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/metrics/compare').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([live, compare]) => {
      setLiveMetrics(live);
      setCompareMetrics(compare);
      setLiveLoading(false);
    });
  }, [workspace.id]);

  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { sprints } = useSprintStore();
  const { getContactsForWorkspace } = useContactStore();

  const wsTasks = useMemo(() => tasks.filter(t => t.workspaceId === workspace.id), [tasks, workspace.id]);
  const wsProjects = useMemo(() => projects.filter(p => p.workspaceId === workspace.id), [projects, workspace.id]);
  const wsSprints = useMemo(() => sprints.filter(s => s.workspaceId === workspace.id), [sprints, workspace.id]);
  const wsContacts = useMemo(() => getContactsForWorkspace(workspace.id), [getContactsForWorkspace, workspace.id]);

  // ── Task metrics ──────────────────────────────────────────────────────
  const wsStatuses = useMemo(() => getTaskStatusesForWorkspace(workspace.id), [workspace.id]);
  const terminalIds = useMemo(() => getTerminalStatusIds(workspace.id), [workspace.id]);
  const firstStatusId = wsStatuses[0]?.id;

  const doneTasks = useMemo(() => wsTasks.filter(t => terminalIds.includes(t.status)), [wsTasks, terminalIds]);
  const completionRate = wsTasks.length > 0 ? Math.round((doneTasks.length / wsTasks.length) * 100) : 0;

  const tasksByStatus = useMemo(() => {
    return wsStatuses.map(s => ({
      ...s,
      count: wsTasks.filter(t => t.status === s.id).length,
    }));
  }, [wsStatuses, wsTasks]);

  const tasksByPriority = useMemo(() => {
    const prios = [
      { id: 'urgent', name: 'Urgent', color: '#EF4444' },
      { id: 'high', name: 'High', color: '#F59E0B' },
      { id: 'medium', name: 'Medium', color: '#3B82F6' },
      { id: 'low', name: 'Low', color: '#6B7280' },
    ];
    return prios.map(p => ({ ...p, count: wsTasks.filter(t => t.priority === p.id).length }));
  }, [wsTasks]);

  // Last 7 days completions
  const recentDone = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return wsTasks.filter(t => terminalIds.includes(t.status) && isAfter(new Date(t.updatedAt), cutoff)).length;
  }, [wsTasks, terminalIds]);

  // Last 30 days completions
  const monthDone = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return wsTasks.filter(t => terminalIds.includes(t.status) && isAfter(new Date(t.updatedAt), cutoff)).length;
  }, [wsTasks, terminalIds]);

  // ── Project metrics ────────────────────────────────────────────────────
  const projectByStatus = useMemo(() => {
    const statuses = [
      { id: 'active', name: 'Active', color: '#10B981' },
      { id: 'paused', name: 'Paused', color: '#F59E0B' },
      { id: 'completed', name: 'Completed', color: '#6366F1' },
      { id: 'archived', name: 'Archived', color: '#6B7280' },
    ];
    return statuses.map(s => ({ ...s, count: wsProjects.filter(p => p.status === s.id).length }));
  }, [wsProjects]);

  // ── Sprint velocity ────────────────────────────────────────────────────
  const completedSprints = useMemo(() => {
    return wsSprints
      .filter(s => s.status === 'completed' || s.status === 'active')
      .slice(-5)
      .map(sprint => {
        const sprintTasks = tasks.filter(t => sprint.taskIds.includes(t.id));
        const done = sprintTasks.filter(t => terminalIds.includes(t.status)).length;
        return { sprint, done, total: sprintTasks.length };
      });
  }, [wsSprints, tasks]);

  const activeSprints = useMemo(() => wsSprints.filter(s => s.status === 'active'), [wsSprints]);

  // ── CRM pipeline ──────────────────────────────────────────────────────
  const pipeline = useMemo(() => getPipelineForWorkspace(workspace.id), [workspace.id]);
  const contactsByStage = useMemo(() => {
    return pipeline.map(stage => ({
      ...stage,
      count: wsContacts.filter(c => c.pipelineStage === stage.id).length,
    }));
  }, [pipeline, wsContacts]);

  const maxStatusCount = Math.max(...tasksByStatus.map(s => s.count), 1);
  const maxPrioCount = Math.max(...tasksByPriority.map(p => p.count), 1);
  const maxProjCount = Math.max(...projectByStatus.map(s => s.count), 1);
  const maxContactCount = Math.max(...contactsByStage.map(s => s.count), 1);
  const maxVelocity = Math.max(...completedSprints.map(s => s.done), 1);

  return (
    <div className="p-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Metrics</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{workspace.name} · {format(new Date(), 'MMMM yyyy')}</p>
        </div>
        {workspace.id === 'korus' && (
          <Link href="/metrics/korus" className="text-xs flex items-center gap-1 hover:opacity-80" style={{ color: accentColor }}>
            KORUS APAC report <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </motion.div>

      {/* ── Live Operations (Supabase) ─────────────────────────────────────── */}
      {!liveLoading && liveMetrics && liveMetrics.total_actions > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: accentColor }} />
            <h2 className="text-sm font-semibold text-white">Live Operations</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#10B98120] text-[#10B981] font-medium ml-1">Supabase</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#0F0F0F] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="w-3.5 h-3.5 text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">Actions</span>
              </div>
              <p className="text-xl font-bold text-white">{liveMetrics.total_actions}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">logged total</p>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bot className="w-3.5 h-3.5 text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">Automation</span>
              </div>
              <p className="text-xl font-bold" style={{ color: liveMetrics.automation_rate >= 80 ? '#10B981' : accentColor }}>
                {liveMetrics.automation_rate}%
              </p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">{liveMetrics.human_interventions} human</p>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Timer className="w-3.5 h-3.5 text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">Avg Duration</span>
              </div>
              <p className="text-xl font-bold text-white">{liveMetrics.avg_duration_minutes}m</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">{liveMetrics.total_duration_minutes}m total</p>
            </div>
            <div className="bg-[#0F0F0F] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">API Cost</span>
              </div>
              <p className="text-xl font-bold text-white">${liveMetrics.total_api_cost_usd.toFixed(4)}</p>
              <p className="text-[10px] text-[#6B7280] mt-0.5">{liveMetrics.total_api_tokens.toLocaleString()} tokens</p>
            </div>
          </div>
          {/* Category breakdown */}
          {Object.keys(liveMetrics.category_breakdown).length > 0 && (
            <div>
              <p className="text-[10px] text-[#6B7280] uppercase tracking-wide font-semibold mb-2">By Category</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(liveMetrics.category_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([cat, count]) => (
                    <span
                      key={cat}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${accentColor}20`, color: accentColor }}
                    >
                      {cat} · {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Workspace Comparison (Supabase) ───────────────────────────────── */}
      {!liveLoading && compareMetrics && Object.values(compareMetrics.workspaces).some(w => w && w.total_actions > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="mb-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#6B7280]" />
            <h2 className="text-sm font-semibold text-white">Workspace Comparison</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { key: 'byron-film', label: 'Byron Film', color: '#D4A017' },
              { key: 'korus', label: 'KORUS', color: '#008080' },
              { key: 'personal', label: 'Personal', color: '#F97316' },
            ] as const).map(({ key, label, color }) => {
              const ws = compareMetrics.workspaces[key];
              return (
                <div key={key} className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2A2A2A]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-semibold text-white">{label}</span>
                  </div>
                  {ws && ws.total_actions > 0 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#6B7280]">Actions</span>
                        <span className="text-white font-medium">{ws.total_actions}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#6B7280]">Automation</span>
                        <span className="font-medium" style={{ color: ws.automation_rate >= 80 ? '#10B981' : color }}>{ws.automation_rate}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#6B7280]">API cost</span>
                        <span className="text-white">${ws.total_api_cost_usd.toFixed(4)}</span>
                      </div>
                      {ws.top_category && (
                        <div className="flex justify-between text-xs">
                          <span className="text-[#6B7280]">Top</span>
                          <span className="text-[#A0A0A0]">{ws.top_category}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#3A3A3A] italic">No actions yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tasks" value={wsTasks.length} sub={`${doneTasks.length} done · ${completionRate}%`} icon={<CheckSquare className="w-4 h-4" />} color={accentColor} index={0} />
        <StatCard label="Completed (7d)" value={recentDone} sub={`${monthDone} this month`} icon={<TrendingUp className="w-4 h-4" />} color="#10B981" index={1} />
        <StatCard label="Active Projects" value={projectByStatus.find(s => s.id === 'active')?.count ?? 0} sub={`${wsProjects.length} total`} icon={<FolderOpen className="w-4 h-4" />} color={accentColor} index={2} />
        <StatCard label="Contacts" value={wsContacts.length} sub={`${activeSprints.length} active sprint${activeSprints.length !== 1 ? 's' : ''}`} icon={<Users className="w-4 h-4" />} color={accentColor} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Task status breakdown */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Tasks by Status</h2>
            {wsTasks.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No tasks yet</p>
            ) : (
              <div className="space-y-3">
                {tasksByStatus.map(s => (
                  <HBar key={s.id} label={s.name} value={s.count} max={maxStatusCount} color={s.color} count={s.count} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Task priority */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Tasks by Priority</h2>
            {wsTasks.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No tasks yet</p>
            ) : (
              <div className="space-y-3">
                {tasksByPriority.map(p => (
                  <HBar key={p.id} label={p.name} value={p.count} max={maxPrioCount} color={p.color} count={p.count} />
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Middle column */}
        <div className="space-y-5">
          {/* Project health */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Project Health</h2>
              <Link href="/projects" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {wsProjects.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No projects yet</p>
            ) : (
              <div className="space-y-3">
                {projectByStatus.map(s => (
                  <HBar key={s.id} label={s.name} value={s.count} max={maxProjCount} color={s.color} count={s.count} />
                ))}
              </div>
            )}
            {/* Top active projects */}
            {wsProjects.filter(p => p.status === 'active').length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                <p className="text-[10px] text-[#6B7280] uppercase tracking-wide font-semibold mb-2">Active</p>
                <div className="space-y-1.5">
                  {wsProjects.filter(p => p.status === 'active').slice(0, 4).map(p => {
                    const ptasks = wsTasks.filter(t => t.projectId === p.id);
                    const pdone = ptasks.filter(t => t.status === 'done').length;
                    const ppct = ptasks.length > 0 ? Math.round((pdone / ptasks.length) * 100) : 0;
                    return (
                      <div key={p.id}>
                        <div className="flex justify-between mb-0.5">
                          <Link href={`/projects/${p.id}`} className="text-xs text-white hover:underline truncate flex-1 mr-2">{p.name}</Link>
                          <span className="text-[10px] text-[#6B7280] shrink-0">{ppct}%</span>
                        </div>
                        <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${ppct}%`, background: accentColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* Completion trend — simple weekly bars */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Completion Rate</h2>
            <div className="space-y-3">
              <div className="flex items-end justify-between text-xs text-[#6B7280]">
                <span>All time</span>
                <span className="text-lg font-bold text-white">{completionRate}%</span>
              </div>
              <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${completionRate}%`, background: completionRate >= 80 ? '#10B981' : completionRate >= 50 ? accentColor : '#F59E0B' }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Total', value: wsTasks.length },
                  { label: 'Done', value: doneTasks.length },
                  { label: 'Active', value: wsTasks.filter(t => !terminalIds.includes(t.status) && t.status !== firstStatusId).length },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <p className="text-base font-bold text-white">{item.value}</p>
                    <p className="text-[10px] text-[#6B7280]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Sprint velocity */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Sprint Velocity</h2>
              <Link href="/sprints" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">
                All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {completedSprints.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No sprint data yet</p>
            ) : (
              <div className="space-y-3">
                {completedSprints.map(({ sprint, done, total }) => (
                  <div key={sprint.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[#A0A0A0] truncate flex-1 mr-2">{sprint.name}</span>
                      <span className="text-xs text-white shrink-0">{done}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxVelocity > 0 ? Math.round((done / maxVelocity) * 100) : 0}%`,
                          background: accentColor,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* CRM pipeline funnel */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Pipeline</h2>
              <Link href="/crm" className="text-xs text-[#6B7280] hover:text-white flex items-center gap-1">
                CRM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {wsContacts.length === 0 ? (
              <p className="text-xs text-[#6B7280] py-4 text-center">No contacts yet</p>
            ) : (
              <div className="space-y-2">
                {contactsByStage.filter(s => s.count > 0).map(s => (
                  <HBar key={s.id} label={s.name} value={s.count} max={maxContactCount} color={s.color} count={s.count} />
                ))}
                {contactsByStage.every(s => s.count === 0) && (
                  <p className="text-xs text-[#6B7280] py-2 text-center">No contacts in pipeline</p>
                )}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[#2A2A2A] flex justify-between text-xs text-[#6B7280]">
              <span>{wsContacts.length} total contacts</span>
              <span>{wsContacts.filter(c => c.pipelineStage).length} in pipeline</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
