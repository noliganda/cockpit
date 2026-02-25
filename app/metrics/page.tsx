'use client';

import { motion } from 'framer-motion';
import { DollarSign, FolderOpen, Users, TrendingUp, CheckSquare, AlertCircle, Award, Target } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { KORUS_METRICS, MOCK_PROJECTS, MOCK_CONTACTS } from '@/lib/data';
import { KORUS_STATUSES, BYRON_FILM_STATUSES } from '@/types';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function MetricsPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { getTasksForWorkspace } = useTaskStore();

  const tasks = getTasksForWorkspace(workspace.id);
  const projects = MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id);
  const contacts = MOCK_CONTACTS.filter(c => c.workspaceId === workspace.id);

  const revenueTrend = Math.round(
    ((KORUS_METRICS.revenue.current - KORUS_METRICS.revenue.previous) / KORUS_METRICS.revenue.previous) * 100
  );

  const statuses = workspace.slug === 'korus' ? KORUS_STATUSES : BYRON_FILM_STATUSES;

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-xl font-bold text-white">Metrics</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">{workspace.name} · Performance overview</p>
      </motion.div>

      {/* KORUS metrics */}
      {workspace.slug === 'korus' && (
        <>
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Revenue</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Revenue MTD"
                value={formatCurrency(KORUS_METRICS.revenue.current)}
                subValue={`vs ${formatCurrency(KORUS_METRICS.revenue.previous)} last month`}
                trend={revenueTrend}
                icon={<DollarSign className="w-4 h-4" />}
                accentColor={accentColor}
                index={0}
              />
              <MetricCard
                label="Deals Won (Q1)"
                value={formatCurrency(KORUS_METRICS.wonDeals.value)}
                subValue={`${KORUS_METRICS.wonDeals.count} deals closed`}
                trend={12}
                icon={<Award className="w-4 h-4" />}
                accentColor={accentColor}
                index={1}
              />
              <MetricCard
                label="Active Leads"
                value={KORUS_METRICS.leads.active}
                subValue={`${KORUS_METRICS.leads.qualified} qualified`}
                icon={<Users className="w-4 h-4" />}
                accentColor={accentColor}
                index={2}
              />
              <MetricCard
                label="Active Projects"
                value={KORUS_METRICS.projects.active}
                subValue={`${KORUS_METRICS.projects.total} total`}
                icon={<FolderOpen className="w-4 h-4" />}
                accentColor={accentColor}
                index={3}
              />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Pipeline Breakdown</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {KORUS_STATUSES.map((status, i) => {
                const count = tasks.filter(t => t.status === status.id).length;
                const contactsInStage = contacts.filter(c => c.pipelineStage === status.id).length;
                return (
                  <motion.div
                    key={status.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                      <span className="text-xs font-medium text-[#A0A0A0]">{status.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{count + contactsInStage}</div>
                    <div className="text-xs text-[#6B7280] mt-1">
                      {count} tasks · {contactsInStage} contacts
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Byron Film metrics */}
      {workspace.slug === 'byron-film' && (
        <>
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Overview</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Tasks"
                value={tasks.length}
                subValue={`${tasks.filter(t => t.priority === 'urgent').length} urgent`}
                icon={<CheckSquare className="w-4 h-4" />}
                accentColor={accentColor}
                index={0}
              />
              <MetricCard
                label="Active Projects"
                value={projects.filter(p => p.status === 'active').length}
                subValue={`${projects.length} total`}
                icon={<FolderOpen className="w-4 h-4" />}
                accentColor={accentColor}
                index={1}
              />
              <MetricCard
                label="Urgent Items"
                value={tasks.filter(t => t.priority === 'urgent').length}
                subValue="Needs attention"
                icon={<AlertCircle className="w-4 h-4" />}
                accentColor={tasks.filter(t => t.priority === 'urgent').length > 0 ? '#EF4444' : accentColor}
                index={2}
              />
              <MetricCard
                label="Total Budget"
                value={formatCurrency(projects.reduce((sum, p) => sum + (p.budget ?? 0), 0))}
                subValue={`${projects.filter(p => p.status === 'active').length} active`}
                icon={<DollarSign className="w-4 h-4" />}
                accentColor={accentColor}
                index={3}
              />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Tasks by Stage</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BYRON_FILM_STATUSES.map((status, i) => {
                const count = tasks.filter(t => t.status === status.id).length;
                return (
                  <motion.div
                    key={status.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                      <span className="text-xs font-medium text-[#A0A0A0]">{status.name}</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{count}</div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Projects table */}
      {projects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Projects</h2>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Budget</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, i) => {
                  const projectTasks = tasks.filter(t => t.projectId === project.id);
                  const STATUS_COLORS: Record<string, string> = {
                    active: '#10B981',
                    paused: '#F59E0B',
                    completed: '#6B7280',
                    archived: '#3A3A3A',
                  };
                  return (
                    <tr key={project.id} className={i < projects.length - 1 ? 'border-b border-[#2A2A2A]' : ''}>
                      <td className="px-4 py-3 text-sm text-white">{project.name}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ background: `${STATUS_COLORS[project.status]}20`, color: STATUS_COLORS[project.status] }}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm" style={{ color: accentColor }}>
                        {project.budget ? formatCurrency(project.budget) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[#A0A0A0]">
                        {projectTasks.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
