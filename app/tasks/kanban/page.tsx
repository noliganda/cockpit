'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, List } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useTaskStore } from '@/stores/task-store';
import { KanbanBoard } from '@/components/kanban-board';
import { TaskDialog } from '@/components/task-dialog';
import { Task, TASK_STATUSES } from '@/types';
import { useProjectStore } from '@/stores/project-store';

export default function KanbanPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { getTasksForWorkspace, addTask, updateTask, deleteTask, moveTask } = useTaskStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [newTaskStatus, setNewTaskStatus] = useState<string | undefined>();

  const statuses = TASK_STATUSES;
  const tasks = getTasksForWorkspace(workspace.id);
  const { projects } = useProjectStore();
  const workspaceProjects = projects.filter(p => p.workspaceId === workspace.id);

  const handleSave = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setEditingTask(undefined);
    setNewTaskStatus(undefined);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setNewTaskStatus(undefined);
    setDialogOpen(true);
  };

  const openCreate = (status?: string) => {
    setEditingTask(undefined);
    setNewTaskStatus(status);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-6 shrink-0"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Kanban Board</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">
            {tasks.length} tasks · {workspace.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/tasks"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
          >
            <List className="w-4 h-4" />
            List view
          </Link>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: accentColor, color: '#0F0F0F' }}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </motion.div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          tasks={tasks}
          statuses={statuses}
          workspaceId={workspace.id}
          accentColor={accentColor}
          onMoveTask={moveTask}
          onEditTask={openEdit}
          onDeleteTask={deleteTask}
          onAddTask={openCreate}
        />
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
