'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, LayoutGrid, List, Filter } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { TaskDialog } from '@/components/task-dialog';
import { Task, getStatusesForWorkspace, getStatusById } from '@/types';
import { format, parseISO } from 'date-fns';

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export default function TasksPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const { getTasksForWorkspace, addTask, updateTask, deleteTask } = useTaskStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const statuses = getStatusesForWorkspace(workspace.id);
  const allTasks = getTasksForWorkspace(workspace.id);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      const matchSearch = !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchSearch && matchPriority && matchStatus;
    });
  }, [allTasks, searchQuery, filterPriority, filterStatus]);

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
        className="flex items-center gap-3 mb-5"
      >
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
      </motion.div>

      {/* Task list */}
      <div className="space-y-1.5">
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
                className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A] transition-colors group"
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

                {/* Status badge */}
                {status && (
                  <span
                    className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: `${status.color}20`, color: status.color }}
                  >
                    {status.name}
                  </span>
                )}

                {/* Due date */}
                {task.dueDate && (
                  <span className="hidden md:block text-xs text-[#A0A0A0] shrink-0">
                    {format(parseISO(task.dueDate), 'MMM d')}
                  </span>
                )}

                {/* Assignee */}
                {task.assignee && (
                  <span className="hidden lg:block text-xs text-[#A0A0A0] shrink-0">
                    {task.assignee}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        accentColor={accentColor}
      />
    </div>
  );
}
