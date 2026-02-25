'use client';

import { motion } from 'framer-motion';
import { DollarSign, FolderOpen, Users, TrendingUp, CheckSquare, AlertCircle } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { KORUS_METRICS, MOCK_TASKS, MOCK_PROJECTS } from '@/lib/data';
import { format } from 'date-fns';
import Link from 'next/link';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);

  const workspaceTasks = MOCK_TASKS.filter(t => t.workspaceId === workspace.id);
  const urgentTasks = workspaceTasks.filter(t => t.priority === 'urgent');
  const recentTasks = workspaceTasks.slice(0, 5);

  const workspaceProjects = MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id);
  const activeProjects = workspaceProjects.filter(p => p.status === 'active');

  const revenueTrend = Math.round(
    ((KORUS_METRICS.revenue.current - KORUS_METRICS.revenue.previous) / KORUS_METRICS.revenue.previous) * 100
  );

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{workspace.icon}</span>
          <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
        </div>
        <p className="text-[#A0A0A0] text-sm">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} · Dashboard Overview
        </p>
      </motion.div>

      {/* KORUS-specific metrics */}
      {workspace.slug === 'korus' && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Key Metrics</h2>
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
              label="Active Projects"
              value={KORUS_METRICS.projects.active}
              subValue={`${KORUS_METRICS.projects.total} total`}
              icon={<FolderOpen className="w-4 h-4" />}
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
              label="Deals Won (Q1)"
              value={formatCurrency(KORUS_METRICS.wonDeals.value)}
              subValue={`${KORUS_METRICS.wonDeals.count} deals closed`}
              trend={12}
              icon={<TrendingUp className="w-4 h-4" />}
              accentColor={accentColor}
              index={3}
            />
          </div>
        </div>
      )}

      {/* Byron Film metrics */}
      {workspace.slug === 'byron-film' && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider mb-3">Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Active Tasks"
              value={workspaceTasks.length}
              subValue={`${urgentTasks.length} urgent`}
              icon={<CheckSquare className="w-4 h-4" />}
              accentColor={accentColor}
              index={0}
            />
            <MetricCard
              label="Active Projects"
              value={activeProjects.length}
              subValue={`${workspaceProjects.length} total`}
              icon={<FolderOpen className="w-4 h-4" />}
              accentColor={accentColor}
              index={1}
            />
            <MetricCard
              label="Urgent Items"
              value={urgentTasks.length}
              subValue="Needs attention"
              icon={<AlertCircle className="w-4 h-4" />}
              accentColor={urgentTasks.length > 0 ? '#EF4444' : accentColor}
              index={2}
            />
            <MetricCard
              label="In Production"
              value={workspaceTasks.filter(t => t.status === 'in-prod').length}
              subValue="Active shoots"
              icon={<TrendingUp className="w-4 h-4" />}
              accentColor={accentColor}
              index={3}
            />
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Tasks</h2>
            <Link
              href="/tasks"
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: accentColor }}
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.length === 0 ? (
              <p className="text-sm text-[#A0A0A0]">No tasks yet</p>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background:
                        task.priority === 'urgent' ? '#EF4444' :
                        task.priority === 'high' ? '#F59E0B' :
                        task.priority === 'medium' ? '#3B82F6' : '#6B7280'
                    }}
                  />
                  <span className="text-sm text-white flex-1 truncate">{task.title}</span>
                  <span className="text-xs text-[#A0A0A0] shrink-0 capitalize">
                    {task.status.replace('-', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Active Projects */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Active Projects</h2>
            <Link
              href="/projects"
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: accentColor }}
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {activeProjects.length === 0 ? (
              <p className="text-sm text-[#A0A0A0]">No active projects</p>
            ) : (
              activeProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: accentColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-[#A0A0A0] truncate">{project.description}</div>
                    )}
                  </div>
                  {project.budget && (
                    <span className="text-xs text-[#A0A0A0] shrink-0">
                      {formatCurrency(project.budget)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
