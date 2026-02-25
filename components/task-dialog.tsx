'use client';

import { useState, useEffect } from 'react';
import { X, Zap, Star } from 'lucide-react';
import { Task, Project, TASK_STATUSES } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useSprintStore } from '@/stores/sprint-store';
import { MOCK_AREAS } from '@/lib/data';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  workspaceId: string;
  initialTask?: Task;
  initialStatus?: string;
  initialProjectId?: string;
  projects?: Project[];
  accentColor?: string;
}

const SEL = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3A3A3A] transition-colors appearance-none';
const INP = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors';
const LBL = 'block text-xs font-medium text-[#A0A0A0] mb-1.5';

export function TaskDialog({
  open,
  onClose,
  onSave,
  workspaceId,
  initialTask,
  initialStatus,
  initialProjectId,
  projects = [],
  accentColor = '#D4A017',
}: TaskDialogProps) {
  const { getSprintsForWorkspace } = useSprintStore();
  const statuses = TASK_STATUSES;
  const sprints = getSprintsForWorkspace(workspaceId);
  const areas = MOCK_AREAS.filter(a => a.workspaceId === workspaceId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(initialStatus ?? statuses[0].id);
  const [dueDate, setDueDate] = useState('');
  const [areaId, setAreaId] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId ?? '');
  const [sprintId, setSprintId] = useState('');
  const [impact, setImpact] = useState('');
  const [effort, setEffort] = useState('');
  const [duration, setDuration] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description ?? '');
      setStatus(initialTask.status);
      setDueDate(initialTask.dueDate ?? '');
      setAreaId(initialTask.areaId ?? '');
      setProjectId(initialTask.projectId ?? '');
      setSprintId(initialTask.sprintId ?? '');
      setImpact(initialTask.impact ?? '');
      setEffort(initialTask.effort ?? '');
      setDuration(initialTask.duration ?? '');
      setUrgent(initialTask.urgent ?? false);
      setImportant(initialTask.important ?? false);
      setTagsInput(initialTask.tags.join(', '));
    } else {
      setTitle('');
      setDescription('');
      setStatus(initialStatus ?? statuses[0].id);
      setDueDate('');
      setAreaId('');
      setProjectId(initialProjectId ?? '');
      setSprintId('');
      setImpact('');
      setEffort('');
      setDuration('');
      setUrgent(false);
      setImportant(false);
      setTagsInput('');
    }
  }, [initialTask, initialStatus, initialProjectId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    onSave({
      workspaceId,
      projectId: projectId || undefined,
      areaId: areaId || undefined,
      sprintId: sprintId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority: urgent ? 'urgent' : 'medium',
      impact: (impact as Task['impact']) || undefined,
      effort: (effort as Task['effort']) || undefined,
      duration: duration.trim() || undefined,
      urgent,
      important,
      dueDate: dueDate || undefined,
      tags,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl w-full max-w-lg shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
              <h2 className="text-base font-semibold text-white">
                {initialTask ? 'Edit Task' : 'New Task'}
              </h2>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#2A2A2A] transition-colors"
              >
                <X className="w-4 h-4 text-[#A0A0A0]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className={LBL}>Title *</label>
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Task title"
                  className={INP}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className={LBL}>Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  className={`${INP} resize-none`}
                />
              </div>

              {/* Two-column grid: Left (due date / area / project / sprint) | Right (status / impact / effort / duration) */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Due Date — left */}
                <div>
                  <label className={LBL}>Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className={INP}
                  />
                </div>

                {/* Status — right */}
                <div>
                  <label className={LBL}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={SEL}>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Area — left */}
                <div>
                  <label className={LBL}>Area</label>
                  <select value={areaId} onChange={e => setAreaId(e.target.value)} className={SEL}>
                    <option value="">No area</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                {/* Impact — right */}
                <div>
                  <label className={LBL}>Impact</label>
                  <select value={impact} onChange={e => setImpact(e.target.value)} className={SEL}>
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Project — left */}
                <div>
                  <label className={LBL}>Project</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className={SEL}>
                    <option value="">No project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Effort — right */}
                <div>
                  <label className={LBL}>Effort</label>
                  <select value={effort} onChange={e => setEffort(e.target.value)} className={SEL}>
                    <option value="">—</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Sprint — left */}
                <div>
                  <label className={LBL}>Sprint</label>
                  <select value={sprintId} onChange={e => setSprintId(e.target.value)} className={SEL}>
                    <option value="">No sprint</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Duration — right */}
                <div>
                  <label className={LBL}>Duration</label>
                  <input
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="e.g. 2h, 3d"
                    className={INP}
                  />
                </div>
              </div>

              {/* Urgent + Important — centered */}
              <div className="flex items-center justify-center gap-8 py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: urgent ? '#EF4444' : '#2A2A2A',
                      background: urgent ? '#EF4444' : '#0F0F0F',
                    }}
                    onClick={() => setUrgent(v => !v)}
                  >
                    {urgent && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l2.5 2.5L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <Zap className="w-3.5 h-3.5 transition-colors" style={{ color: urgent ? '#EF4444' : '#6B7280' }} />
                  <span className={`text-sm font-medium transition-colors ${urgent ? 'text-white' : 'text-[#A0A0A0]'}`}>
                    Urgent
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                    style={{
                      borderColor: important ? '#F59E0B' : '#2A2A2A',
                      background: important ? '#F59E0B' : '#0F0F0F',
                    }}
                    onClick={() => setImportant(v => !v)}
                  >
                    {important && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l2.5 2.5L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <Star className="w-3.5 h-3.5 transition-colors" style={{ color: important ? '#F59E0B' : '#6B7280' }} />
                  <span className={`text-sm font-medium transition-colors ${important ? 'text-white' : 'text-[#A0A0A0]'}`}>
                    Important
                  </span>
                </label>
              </div>

              {/* Tags */}
              <div>
                <label className={LBL}>
                  Tags <span className="text-[#6B7280] font-normal">(comma-separated)</span>
                </label>
                <input
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="design, urgent, client"
                  className={INP}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ background: accentColor, color: '#0F0F0F' }}
                >
                  {initialTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
