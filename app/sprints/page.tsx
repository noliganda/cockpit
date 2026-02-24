'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Timer, Calendar, Target, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, isPast } from 'date-fns';
import { useWorkspace } from '@/hooks/use-workspace';
import { useSprintStore } from '@/stores/sprint-store';
import { useTaskStore } from '@/stores/task-store';

const STATUS_COLORS = {
  planning: '#6B7280',
  active: '#10B981',
  completed: '#6366F1',
};

export default function SprintsPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const { getSprintsForWorkspace, addSprint, deleteSprint, updateSprint } = useSprintStore();
  const { getTasksForWorkspace } = useTaskStore();

  const sprints = getSprintsForWorkspace(workspace.id);
  const tasks = getTasksForWorkspace(workspace.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate || isSubmitting) return;
    setIsSubmitting(true);
    addSprint({
      workspaceId: workspace.id,
      name: name.trim(),
      goal: goal.trim() || undefined,
      startDate,
      endDate,
      status: 'planning',
      taskIds: [],
    });
    setName('');
    setGoal('');
    setStartDate('');
    setEndDate('');
    setDialogOpen(false);
    setIsSubmitting(false);
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
          <h1 className="text-xl font-bold text-white">Sprints</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{sprints.length} sprints · {workspace.name}</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: accentColor, color: '#0F0F0F' }}
        >
          <Plus className="w-4 h-4" />
          New Sprint
        </button>
      </motion.div>

      {/* Sprint list */}
      {sprints.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 bg-[#1A1A1A] border border-[#2A2A2A] border-dashed rounded-xl"
        >
          <Timer className="w-8 h-8 text-[#A0A0A0] mb-3" />
          <p className="text-sm text-[#A0A0A0]">No sprints yet</p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-3 text-xs font-medium"
            style={{ color: accentColor }}
          >
            + Create your first sprint
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sprints.map((sprint, i) => {
            const sprintTasks = tasks.filter(t => sprint.taskIds.includes(t.id));
            const isOverdue = sprint.status !== 'completed' && isPast(parseISO(sprint.endDate));
            return (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{sprint.name}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ background: `${STATUS_COLORS[sprint.status]}20`, color: STATUS_COLORS[sprint.status] }}
                      >
                        {sprint.status}
                      </span>
                    </div>
                    {sprint.goal && (
                      <p className="text-xs text-[#A0A0A0] mt-1">{sprint.goal}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSprint(sprint.id)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#2A2A2A] transition-colors opacity-0 group-hover:opacity-100 text-[#A0A0A0] hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#A0A0A0] mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className={isOverdue ? 'text-red-400' : ''}>
                      {format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    {sprintTasks.length} tasks
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sprint.status === 'planning' && (
                      <button
                        onClick={() => updateSprint(sprint.id, { status: 'active' })}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium hover:opacity-80 transition-opacity"
                        style={{ background: '#10B98120', color: '#10B981' }}
                      >
                        Start Sprint
                      </button>
                    )}
                    {sprint.status === 'active' && (
                      <button
                        onClick={() => updateSprint(sprint.id, { status: 'completed' })}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium hover:opacity-80 transition-opacity"
                        style={{ background: '#6366F120', color: '#6366F1' }}
                      >
                        Complete
                      </button>
                    )}
                  </div>
                  <Link
                    href={`/sprints/${sprint.id}`}
                    className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ color: accentColor }}
                  >
                    Board
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Sprint Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
                <h2 className="text-base font-semibold text-white">New Sprint</h2>
                <button
                  onClick={() => setDialogOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#2A2A2A] transition-colors"
                >
                  <X className="w-4 h-4 text-[#A0A0A0]" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">Sprint Name *</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Sprint 1"
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">Sprint Goal</label>
                  <input
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="What is the goal of this sprint?"
                    className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3A3A3A] transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#A0A0A0] mb-1.5">End Date *</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3A3A3A] transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(false)}
                    className="px-4 py-2 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: accentColor, color: '#0F0F0F' }}
                  >
                    Create Sprint
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
