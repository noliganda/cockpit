'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TaskDialog } from '@/components/task-dialog';
import { WORKSPACES } from '@/types';
import type { Task } from '@/types';
import { formatRelativeDate, isOverdue, cn } from '@/lib/utils';
import {
  Plus, Search, Kanban, AlertTriangle, Calendar,
} from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkspace, setFilterWorkspace] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [quickAdd, setQuickAdd] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    if (data.data) setTasks(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const allStatuses = Array.from(new Set(tasks.map((t) => t.status)));
  const allAssignees = Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))) as string[];

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterWorkspace !== 'all' && t.workspaceId !== filterWorkspace) return false;
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleQuickAdd(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !quickAdd.trim()) return;
    setAdding(true);
    const wsId = filterWorkspace !== 'all' ? filterWorkspace : 'personal';
    const ws = WORKSPACES.find((w) => w.id === wsId)!;
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: quickAdd.trim(), workspaceId: wsId, status: ws.statuses[0] }),
    });
    const data = await res.json();
    if (data.data) setTasks((prev) => [data.data, ...prev]);
    setQuickAdd('');
    setAdding(false);
  }

  function openTask(task: Task) {
    setSelectedTask(task);
    setDialogOpen(true);
  }

  function handleSave(updated: Task) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDialogOpen(false);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{filtered.length} tasks</p>
        </div>
        <Link href="/tasks/kanban">
          <Button variant="outline" size="sm">
            <Kanban className="h-4 w-4 mr-1.5" />
            Kanban
          </Button>
        </Link>
      </div>

      {/* Quick add */}
      <div className="relative">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
        <Input
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={handleQuickAdd}
          placeholder={`Quick add task… press Enter to create ${filterWorkspace !== 'all' ? `in ${WORKSPACES.find(w => w.id === filterWorkspace)?.name}` : '(Personal)'}`}
          disabled={adding}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterWorkspace} onValueChange={setFilterWorkspace}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workspaces</SelectItem>
            {WORKSPACES.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {allStatuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allAssignees.length > 0 && (
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {allAssignees.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Task table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#6B7280]">Loading tasks...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#6B7280]">
            {tasks.length === 0 ? 'No tasks yet. Add one above or sync from Notion.' : 'No tasks match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2A2A] text-xs text-[#6B7280]">
                  <th className="px-4 py-2.5 text-left font-medium">Title</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden sm:table-cell">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Workspace</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Assignee</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Due</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden xl:table-cell">Priority</th>
                  <th className="px-4 py-2.5 text-left font-medium hidden xl:table-cell">Tags</th>
                </tr>
              </thead>
              <motion.tbody
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
              >
                {filtered.map((task) => {
                  const ws = WORKSPACES.find((w) => w.id === task.workspaceId);
                  const overdue = task.dueDate ? isOverdue(new Date(task.dueDate)) : false;
                  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] ?? '#6B7280' : '#6B7280';

                  return (
                    <motion.tr
                      key={task.id}
                      variants={{
                        hidden: { opacity: 0, x: -4 },
                        show: { opacity: 1, x: 0, transition: { duration: 0.2 } },
                      }}
                      onClick={() => openTask(task)}
                      className="border-b border-[#2A2A2A] hover:bg-[#222222] cursor-pointer transition-colors last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {ws && (
                            <div
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: ws.color }}
                            />
                          )}
                          <span className="text-sm text-white line-clamp-1">{task.title}</span>
                          {task.notionId && (
                            <Badge variant="notion" className="shrink-0 hidden sm:inline-flex">N</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-[#A0A0A0]">{task.status}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {ws && (
                          <span
                            className="text-xs"
                            style={{ color: ws.color }}
                          >
                            {ws.icon} {ws.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-[#A0A0A0]">{task.assignee ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {task.dueDate ? (
                          <div className={cn('flex items-center gap-1 text-xs', overdue ? 'text-red-400' : 'text-[#A0A0A0]')}>
                            {overdue && <AlertTriangle className="h-3 w-3" />}
                            {!overdue && <Calendar className="h-3 w-3" />}
                            {formatRelativeDate(new Date(task.dueDate))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B7280]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {task.priority ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: priorityColor }} />
                            <span className="text-xs text-[#A0A0A0] capitalize">{task.priority}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#6B7280]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {task.tags?.slice(0, 2).map((tag) => (
                            <Badge key={tag} className="text-[10px] px-1.5">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </Card>

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
