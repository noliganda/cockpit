'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, CheckSquare, AlertCircle, ArrowRight, Timer, Target, Calendar } from 'lucide-react';
import { MetricCard } from '@/components/metric-card';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { useSprintStore } from '@/stores/sprint-store';
import { format, parseISO, differenceInDays, isPast, startOfDay, isToday } from 'date-fns';
import Link from 'next/link';

function isOverdue(dateStr: string | undefined) {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return isPast(startOfDay(d)) && !isToday(d);
}

export default function DashboardPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { tasks } = useTaskStore();
  const { projects } = useProjectStore();
  const { sprints } = useSprintStore();

  const wsTasks = useMemo(() => tasks.filter(t => t.workspaceId === workspace.id), [tasks, workspace.id]);
  const wsProjects = useMemo(() => projects.filter(p => p.workspaceId === workspace.id), [projects, workspace.id]);
  const activeProjects = useMemo(() => wsProjects.filter(p => p.status === 'active'), [wsProjects]);
  const inProgressTasks = useMemo(() => wsTasks.filter(t => t.status === 'in-progress'), [wsTasks]);
  const doneTasks = useMemo(() => wsTasks.filter(t => t.status === 'done'), [wsTasks]);
  const overdueTasks = useMemo(() => wsTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done'), [wsTasks]);
  const recentTasks = useMemo(() => [...wsTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6), [wsTasks]);

  const activeSprint = useMemo(
    () => sprints.find(s => s.workspaceId === workspace.id && s.status === 'active'),
    [sprints, workspace.id],
  );
  const sprintTasks = useMemo(
    () => activeSprint ? tasks.filter(t => activeSprint.taskIds.includes(t.id)) : [],
    [activeSprint, tasks],
  );
  const sprintDone = useMemo(() => sprintTasks.filter(t => t.status === 'done').length, [sprintTasks]);
  const sprintPct = sprintTasks.length > 0 ? Math.round((sprintDone / sprintTasks.length) * 100) : 0;
  const sprintDaysLeft = activeSprint ? Math.max(differenceInDays(parseISO(activeSprint.endDate), new Date()), 0) : 0;

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
        <MetricCard label="Overdue" value={overdueTasks.length} subValue={overdueTasks.length > 0 ? 'Needs attention' : 'All clear'} icon={<AlertCircle className="w-4 h-4" />} accentColor={overdueTasks.length > 0 ? '#EF4444' : '#10B981'} index={3} />
      </div>

      {/* Active Sprint Banner (if exists) */}
      {activeSprint && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentColor}20` }}>
                <Timer className="w-4 h-4" style={{ color: accentColor }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{activeSprint.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981] font-medium shrink-0">Active</span>
                </div>
                {activeSprint.goal && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Target className="w-3 h-3 text-[#6B7280] shrink-0" />
                    <p className="text-xs text-[#A0A0A0] truncate">{activeSprint.goal}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 shrink-0">
              <div className="text-right">
                <p className="text-xs text-[#6B7280]">Progress</p>
                <p className="text-sm font-bold text-white">{sprintDone}/{sprintTasks.length} <span className="text-xs text-[#6B7280] font-normal">tasks</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#6B7280]">Days left</p>
                <p className="text-sm font-bold" style={{ color: sprintDaysLeft <= 2 ? '#EF4444' : sprintDaysLeft <= 5 ? '#F59E0B' : '#10B981' }}>{sprintDaysLeft}d</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="w-32 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${sprintPct}%`, background: sprintPct >= 80 ? '#10B981' : accentColor }} />
                </div>
                <p className="text-[10px] text-[#6B7280]">{sprintPct}% complete</p>
              </div>
              <Link href={`/sprints/${activeSprint.id}`} className="text-xs flex items-center gap-1 hover:opacity-80" style={{ color: accentColor }}>
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

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
