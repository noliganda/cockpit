'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, User, Tag, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { useWorkspace } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { TaskDialog } from '@/components/task-dialog';
import { Task, getStatusesForWorkspace, getStatusById } from '@/types';
import { MOCK_PROJECTS } from '@/lib/data';
import { format, parseISO } from 'date-fns';

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  paused: '#F59E0B',
  completed: '#6B7280',
  archived: '#3A3A3A',
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const { tasks, addTask, updateTask, deleteTask } = useTaskStore();
  const statuses = getStatusesForWorkspace(workspace.id);

  const project = MOCK_PROJECTS.find(p => p.id === id);
  const projectTasks = tasks.filter(t => t.projectId === id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <p className="text-[#A0A0A0] text-sm">Project not found</p>
          <Link href="/projects" className="mt-3 text-xs font-medium" style={{ color: accentColor }}>
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = { ...taskData, projectId: id };
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
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
        className="mb-6"
      >
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-[#A0A0A0] mt-0.5">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                style={{ background: `${STATUS_COLORS[project.status]}20`, color: STATUS_COLORS[project.status] }}
              >
                {project.status}
              </span>
              {project.startDate && (
                <span className="text-xs text-[#A0A0A0]">
                  Started {project.startDate}
                </span>
              )}
              {project.budget && (
                <span className="text-xs font-medium" style={{ color: accentColor }}>
                  ${project.budget.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors shrink-0"
            style={{ background: accentColor, color: '#0F0F0F' }}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </motion.div>

      {/* Tasks grouped by status */}
      {projectTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-48 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl"
        >
          <p className="text-sm text-[#A0A0A0]">No tasks in this project yet</p>
          <button
            onClick={openCreate}
            className="mt-3 text-xs font-medium"
            style={{ color: accentColor }}
          >
            + Add your first task
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {statuses.map(status => {
            const statusTasks = projectTasks.filter(t => t.status === status.id);
            if (statusTasks.length === 0) return null;
            return (
              <div key={status.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
                  <span className="text-xs font-semibold text-white">{status.name}</span>
                  <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">
                    {statusTasks.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {statusTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg hover:border-[#3A3A3A] transition-colors group"
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: PRIORITY_COLORS[task.priority] }}
                      />
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
                      {task.assignee && (
                        <span className="hidden md:flex items-center gap-1 text-xs text-[#A0A0A0] shrink-0">
                          <User className="w-3 h-3" />
                          {task.assignee}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="hidden sm:flex items-center gap-1 text-xs text-[#A0A0A0] shrink-0">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(task.dueDate), 'MMM d')}
                        </span>
                      )}
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(undefined); }}
        onSave={handleSave}
        workspaceId={workspace.id}
        initialTask={editingTask}
        initialProjectId={id}
        projects={[project]}
        accentColor={accentColor}
      />
    </div>
  );
}
