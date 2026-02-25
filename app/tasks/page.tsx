'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, LayoutGrid, ChevronDown, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { TaskDialog } from '@/components/task-dialog';
import { Task, TASK_STATUSES, getStatusById } from '@/types';
import { useProjectStore } from '@/stores/project-store';
import { format, parseISO, isToday, isTomorrow, isPast, isThisWeek, startOfDay } from 'date-fns';

type DueFilter = 'all' | 'overdue' | 'today' | 'week' | 'none';

function dueDateColor(dateStr: string | undefined): string {
  if (!dateStr) return '#6B7280';
  const d = parseISO(dateStr);
  if (isPast(startOfDay(d)) && !isToday(d)) return '#EF4444'; // overdue
  if (isToday(d)) return '#F59E0B'; // today
  if (isTomorrow(d)) return '#F59E0B'; // tomorrow
  return '#6B7280';
}

function dueDateLabel(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

function isOverdue(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return isPast(startOfDay(d)) && !isToday(d);
}

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export default function TasksPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { getTasksForWorkspace, addTask, updateTask, deleteTask } = useTaskStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDue, setFilterDue] = useState<DueFilter>('all');

  const statuses = TASK_STATUSES;
  const allTasks = getTasksForWorkspace(workspace.id);
  const { projects } = useProjectStore();
  const workspaceProjects = projects.filter(p => p.workspaceId === workspace.id);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

  const overdueCount = useMemo(() => allTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done').length, [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const matchSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || task.status === filterStatus;
      let matchDue = true;
      if (filterDue === 'overdue') matchDue = isOverdue(task.dueDate) && task.status !== 'done';
      else if (filterDue === 'today') matchDue = !!task.dueDate && isToday(parseISO(task.dueDate));
      else if (filterDue === 'week') matchDue = !!task.dueDate && isThisWeek(parseISO(task.dueDate), { weekStartsOn: 1 });
      else if (filterDue === 'none') matchDue = !task.dueDate;
      return matchSearch && matchPriority && matchStatus && matchDue;
    });
  }, [allTasks, searchQuery, filterPriority, filterStatus, filterDue]);

  const handleSave = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setEditingTask(undefined);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">
            {allTasks.length} tasks · {workspace.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks/kanban"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </Link>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: accentColor, color: '#0F0F0F' }}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="space-y-3 mb-5"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#A0A0A0] focus:outline-none focus:border-[#3A3A3A] transition-colors"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-[#A0A0A0] focus:outline-none focus:border-[#3A3A3A] transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Due date quick filters */}
        <div className="flex items-center gap-2">
          {([
            { id: 'all', label: 'All' },
            { id: 'overdue', label: overdueCount > 0 ? `Overdue (${overdueCount})` : 'Overdue', color: '#EF4444' },
            { id: 'today', label: 'Due Today', color: '#F59E0B' },
            { id: 'week', label: 'This Week', color: accentColor },
            { id: 'none', label: 'No Date', color: '#6B7280' },
          ] as { id: DueFilter; label: string; color?: string }[]).map(f => (
            <button
              key={f.id}
              onClick={() => setFilterDue(f.id)}
              className="px-2.5 py-1 text-xs rounded-full font-medium transition-colors"
              style={filterDue === f.id
                ? { background: `${f.color ?? accentColor}25`, color: f.color ?? accentColor, border: `1px solid ${f.color ?? accentColor}50` }
                : { background: '#1A1A1A', color: '#6B7280', border: '1px solid #2A2A2A' }}
            >
              {f.id === 'overdue' && overdueCount > 0 && filterDue !== 'overdue' && (
                <AlertCircle className="w-2.5 h-2.5 inline mr-1 text-[#EF4444]" />
              )}
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Task list */}
      <div className="space-y-1.5" onClick={() => setStatusDropdownOpen(null)}>
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-[#A0A0A0]">
            <p className="text-sm">No tasks found</p>
            <button
              onClick={openCreate}
              className="mt-3 text-xs font-medium"
              style={{ color: accentColor }}
            >
              + Create your first task
            </button>
          </div>
        ) : (
          filteredTasks.map((task, i) => {
            const status = getStatusById(workspace.id, task.status);
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                onClick={() => openEdit(task)}
                className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A] transition-colors group cursor-pointer"
              >
                {/* Priority dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: PRIORITY_COLORS[task.priority] }}
                />

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white">{task.title}</span>
                  {task.tags.length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                      {task.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs text-[#6B7280]">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick status dropdown */}
                {status && (
                  <div className="relative hidden sm:block" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setStatusDropdownOpen(statusDropdownOpen === task.id ? null : task.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                      style={{ background: `${status.color}20`, color: status.color }}
                    >
                      {status.name}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {statusDropdownOpen === task.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl py-1 min-w-[160px]">
                        {statuses.map(s => (
                          <button
                            key={s.id}
                            onClick={() => { updateTask(task.id, { status: s.id }); setStatusDropdownOpen(null); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left hover:bg-[#2A2A2A] transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                            <span className={s.id === task.status ? 'text-white font-medium' : 'text-[#A0A0A0]'}>{s.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Due date */}
                {task.dueDate && (
                  <span
                    className="hidden md:block text-xs shrink-0 font-medium"
                    style={{ color: dueDateColor(task.dueDate) }}
                  >
                    {isOverdue(task.dueDate) && task.status !== 'done' && '⚠ '}
                    {dueDateLabel(task.dueDate)}
                  </span>
                )}

                {/* Assignee */}
                {task.assignee && (
                  <span className="hidden lg:block text-xs text-[#A0A0A0] shrink-0">
                    {task.assignee}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(task)}
                    className="px-2.5 py-1 text-xs text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="px-2.5 py-1 text-xs text-[#A0A0A0] hover:text-red-400 hover:bg-[#2A2A2A] rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(undefined); }}
        onSave={handleSave}
        workspaceId={workspace.id}
        initialTask={editingTask}
        projects={workspaceProjects}
        accentColor={accentColor}
      />
    </div>
  );
}
