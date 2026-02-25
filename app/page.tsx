'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, CheckSquare, AlertCircle, ArrowRight } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { format } from 'date-fns';
import Link from 'next/link';

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();

  const wsTasks = useMemo(() => tasks.filter(t => t.workspaceId === workspace.id), [tasks, workspace.id]);
  const wsProjects = useMemo(() => projects.filter(p => p.workspaceId === workspace.id), [projects, workspace.id]);
  const activeProjects = useMemo(() => wsProjects.filter(p => p.status === 'active'), [wsProjects]);
  const urgentTasks = useMemo(() => wsTasks.filter(t => t.priority === 'urgent'), [wsTasks]);
  const inProgressTasks = useMemo(() => wsTasks.filter(t => t.status === 'in-progress'), [wsTasks]);
  const doneTasks = useMemo(() => wsTasks.filter(t => t.status === 'done'), [wsTasks]);
  const recentTasks = useMemo(() => [...wsTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6), [wsTasks]);

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{workspace.icon}</span>
          <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
        </div>
        <p className="text-[#A0A0A0] text-sm">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Tasks" value={wsTasks.length} subValue={`${inProgressTasks.length} in progress`} icon={<CheckSquare className="w-4 h-4" />} accentColor={accentColor} index={0} />
        <MetricCard label="Projects" value={activeProjects.length} subValue={`${wsProjects.length} total`} icon={<FolderOpen className="w-4 h-4" />} accentColor={accentColor} index={1} />
        <MetricCard label="Completed" value={doneTasks.length} subValue={wsTasks.length > 0 ? `${Math.round((doneTasks.length / wsTasks.length) * 100)}% done` : 'No tasks yet'} icon={<CheckSquare className="w-4 h-4" />} accentColor="#10B981" index={2} />
        <MetricCard label="Urgent" value={urgentTasks.length} subValue={urgentTasks.length > 0 ? 'Needs attention' : 'All clear'} icon={<AlertCircle className="w-4 h-4" />} accentColor={urgentTasks.length > 0 ? '#EF4444' : '#10B981'} index={3} />
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Tasks</h2>
            <Link href="/tasks" className="text-xs font-medium flex items-center gap-1 hover:opacity-80" style={{ color: accentColor }}>View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#6B7280]">No tasks yet</p>
              <Link href="/tasks" className="text-xs mt-2 inline-block" style={{ color: accentColor }}>Create your first task →</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: task.priority === 'urgent' ? '#EF4444' : task.priority === 'high' ? '#F59E0B' : task.priority === 'medium' ? '#3B82F6' : '#6B7280' }} />
                  <span className="text-sm text-white flex-1 truncate">{task.title}</span>
                  <span className="text-xs text-[#A0A0A0] shrink-0 capitalize">{task.status.replace('-', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Active Projects */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Active Projects</h2>
            <Link href="/projects" className="text-xs font-medium flex items-center gap-1 hover:opacity-80" style={{ color: accentColor }}>View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {activeProjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#6B7280]">No active projects</p>
              <Link href="/projects" className="text-xs mt-2 inline-block" style={{ color: accentColor }}>Create your first project →</Link>
            </div>
          ) : (
            <div className="space-y-1.5">
              {activeProjects.map(project => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: accentColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{project.name}</p>
                    {project.description && <p className="text-xs text-[#A0A0A0] truncate">{project.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
