'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, Target, Zap } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { format, parseISO } from 'date-fns';
import { useWorkspace } from '@/hooks/use-workspace';
import { useSprintStore } from '@/stores/sprint-store';
import { useTaskStore } from '@/stores/task-store';
import { TaskDialog } from '@/components/task-dialog';
import { Task, getStatusesForWorkspace } from '@/types';
import { MOCK_PROJECTS } from '@/lib/data';

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

const SPRINT_STATUS_COLORS = {
  planning: '#6B7280',
  active: '#10B981',
  completed: '#6366F1',
};

export default function SprintBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const { sprints, addTaskToSprint } = useSprintStore();
  const { tasks, addTask, updateTask, deleteTask, moveTask } = useTaskStore();
  const statuses = getStatusesForWorkspace(workspace.id);
  const workspaceProjects = MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id);

  const sprint = sprints.find(s => s.id === id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [newTaskStatus, setNewTaskStatus] = useState<string | undefined>();

  if (!sprint) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <p className="text-[#A0A0A0] text-sm mb-3">Sprint not found</p>
          <Link href="/sprints" className="text-xs font-medium inline-flex items-center gap-1 hover:opacity-80" style={{ color: accentColor }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sprints
          </Link>
        </div>
      </div>
    );
  }

  const sprintTasks = tasks.filter(t => sprint.taskIds.includes(t.id));
  const workspaceTasks = tasks.filter(t => t.workspaceId === workspace.id && !sprint.taskIds.includes(t.id));

  const handleSave = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      const newTask = addTask(taskData);
      addTaskToSprint(sprint.id, newTask.id);
    }
    setEditingTask(undefined);
    setNewTaskStatus(undefined);
  };

  const openCreate = (status?: string) => {
    setEditingTask(undefined);
    setNewTaskStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setNewTaskStatus(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 shrink-0"
      >
        <Link
          href="/sprints"
          className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Sprints
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{sprint.name}</h1>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
                style={{ background: `${SPRINT_STATUS_COLORS[sprint.status]}20`, color: SPRINT_STATUS_COLORS[sprint.status] }}
              >
                {sprint.status}
              </span>
            </div>
            {sprint.goal && (
              <div className="flex items-center gap-1.5 mt-1">
                <Target className="w-3.5 h-3.5 text-[#6B7280]" />
                <p className="text-sm text-[#A0A0A0]">{sprint.goal}</p>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <p className="text-xs text-[#6B7280]">
                {format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
              </p>
              <span className="text-xs text-[#6B7280]">· {sprintTasks.length} tasks</span>
            </div>
          </div>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors shrink-0"
            style={{ background: accentColor, color: '#0F0F0F' }}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </motion.div>

      {/* Sprint board - columns by status */}
      <div className="flex-1 overflow-hidden">
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {statuses.map((status, colIndex) => {
            const columnTasks = sprintTasks.filter(t => t.status === status.id);
            return (
              <motion.div
                key={status.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: colIndex * 0.04 }}
                className="flex-shrink-0 w-[260px] flex flex-col"
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
                    <span className="text-xs font-semibold text-white">{status.name}</span>
                    <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openCreate(status.id)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#2A2A2A] transition-colors text-[#A0A0A0] hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="flex-1 overflow-y-auto space-y-2 rounded-lg min-h-[120px] p-2 bg-transparent">
                  {columnTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="bg-[#222222] border border-[#2A2A2A] hover:border-[#3A3A3A] rounded-lg p-3 group transition-colors"
                    >
                      <div
                        className="w-full h-0.5 rounded-full mb-2"
                        style={{ background: PRIORITY_COLORS[task.priority] }}
                      />
                      <p className="text-sm text-white font-medium leading-snug mb-2">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-[#A0A0A0] line-clamp-2 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {task.assignee && (
                          <span className="text-xs text-[#6B7280]">{task.assignee}</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                          <button
                            onClick={() => openEdit(task)}
                            className="px-2 py-0.5 text-xs text-[#A0A0A0] hover:text-white hover:bg-[#3A3A3A] rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="px-2 py-0.5 text-xs text-[#A0A0A0] hover:text-red-400 hover:bg-[#3A3A3A] rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {columnTasks.length === 0 && (
                    <button
                      onClick={() => openCreate(status.id)}
                      className="w-full py-3 rounded-lg border border-dashed border-[#2A2A2A] text-xs text-[#6B7280] hover:text-[#A0A0A0] hover:border-[#3A3A3A] transition-colors"
                    >
                      + Add task
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(undefined); setNewTaskStatus(undefined); }}
        onSave={handleSave}
        workspaceId={workspace.id}
        initialTask={editingTask}
        initialStatus={newTaskStatus}
        projects={workspaceProjects}
        accentColor={accentColor}
      />
    </div>
  );
}
