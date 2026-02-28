'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatRelativeDate, isOverdue } from '@/lib/utils';
import { WORKSPACES } from '@/types';
import type { Task, ActivityLog } from '@/types';
import {
  CheckSquare, AlertTriangle, Clock, List,
  Zap, User, FolderOpen,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-[#A0A0A0]">{label}</CardTitle>
            <div className="rounded-md p-1.5" style={{ backgroundColor: color + '22' }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-[#6B7280] mt-1">{sub}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function activityIcon(entityType: string) {
  switch (entityType) {
    case 'task': return CheckSquare;
    case 'project': return FolderOpen;
    case 'sprint': return Zap;
    default: return User;
  }
}

function activityColor(action: string) {
  switch (action) {
    case 'created': return '#22C55E';
    case 'updated': return '#3B82F6';
    case 'deleted': return '#EF4444';
    case 'synced': return '#008080';
    default: return '#6B7280';
  }
}

export default function HomePage() {
  const today = formatDate(new Date(), 'EEEE, MMMM d, yyyy');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tasksRes, activityRes] = await Promise.all([
          fetch('/api/tasks'),
          fetch('/api/activity?limit=10'),
        ]);
        const tasksData = await tasksRes.json();
        const activityData = await activityRes.json();
        if (tasksData.data) setTasks(tasksData.data);
        if (activityData.data) setActivity(activityData.data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const now = new Date();
  const todayStr = formatDate(now, 'yyyy-MM-dd');
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const dueToday = tasks.filter((t) => t.dueDate && formatDate(new Date(t.dueDate), 'yyyy-MM-dd') === todayStr);
  const dueThisWeek = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) > now && new Date(t.dueDate) <= weekEnd
  );
  const overdue = tasks.filter((t) => t.dueDate && isOverdue(new Date(t.dueDate)));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-semibold text-white">Good morning</h1>
        <p className="mt-1 text-sm text-[#A0A0A0]">{today}</p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          label="Due Today"
          value={loading ? '—' : dueToday.length}
          icon={Clock}
          color="#F59E0B"
          sub="tasks requiring attention"
        />
        <StatCard
          label="Due This Week"
          value={loading ? '—' : dueThisWeek.length}
          icon={CheckSquare}
          color="#3B82F6"
          sub="upcoming deadlines"
        />
        <StatCard
          label="Overdue"
          value={loading ? '—' : overdue.length}
          icon={AlertTriangle}
          color="#EF4444"
          sub={overdue.length > 0 ? 'needs attention' : 'all clear'}
        />
        <StatCard
          label="Total Tasks"
          value={loading ? '—' : tasks.length}
          icon={List}
          color="#22C55E"
          sub="across all workspaces"
        />
      </motion.div>

      {/* Workspace stats + Activity feed */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Workspace breakdown */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {WORKSPACES.map((ws) => {
                const wsTasks = tasks.filter((t) => t.workspaceId === ws.id);
                const wsOverdue = wsTasks.filter((t) => t.dueDate && isOverdue(new Date(t.dueDate)));
                // Count by status
                const statusCounts: Record<string, number> = {};
                wsTasks.forEach((t) => {
                  statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
                });
                const topStatuses = Object.entries(statusCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3);

                return (
                  <div key={ws.id} className="rounded-lg border border-[#2A2A2A] bg-[#222222] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-md text-sm"
                          style={{ backgroundColor: ws.color + '22', color: ws.color }}
                        >
                          {ws.icon}
                        </div>
                        <span className="text-sm font-medium text-white">{ws.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {wsOverdue.length > 0 && (
                          <Badge variant="danger">{wsOverdue.length} overdue</Badge>
                        )}
                        <span className="text-sm text-[#6B7280]">{wsTasks.length} tasks</span>
                      </div>
                    </div>
                    {loading ? (
                      <p className="text-xs text-[#6B7280]">Loading...</p>
                    ) : topStatuses.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {topStatuses.map(([status, count]) => (
                          <span
                            key={status}
                            className="inline-flex items-center gap-1 rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-[#A0A0A0]"
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: ws.color }}
                            />
                            {status} · {count}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#6B7280]">No tasks yet</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity feed */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-[#6B7280]">Loading...</p>
              ) : activity.length === 0 ? (
                <p className="text-sm text-[#6B7280]">No activity yet. Create a task to get started.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map((log) => {
                    const Icon = activityIcon(log.entityType);
                    const color = activityColor(log.action);
                    return (
                      <div key={log.id} className="flex gap-2.5">
                        <div
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: color + '22' }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-white truncate">
                            <span className="text-[#A0A0A0] capitalize">{log.actor}</span>{' '}
                            {log.action}{' '}
                            <span className="font-medium">{log.entityTitle}</span>
                          </p>
                          <p className="text-xs text-[#6B7280] mt-0.5">
                            {formatRelativeDate(new Date(log.timestamp))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick help */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-[#A0A0A0]">
              <div>
                <p className="text-white font-medium mb-1">Import tasks</p>
                <p>Go to <span className="text-[#A0A0A0]">Settings</span> → trigger a Notion sync</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Quick navigate</p>
                <p>Press <kbd className="border border-[#2A2A2A] rounded px-1 py-0.5 text-xs">⌘K</kbd> for the command palette</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Sync anytime</p>
                <p>Use the <span className="text-[#A0A0A0]">↺ sync button</span> in the top-right corner</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
