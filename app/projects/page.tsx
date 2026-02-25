'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { useProjectStore } from '@/stores/project-store';
import { Project } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  paused: '#F59E0B',
  completed: '#6B7280',
  archived: '#3A3A3A',
};

const INP = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors';
const SEL = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3A3A3A] transition-colors appearance-none';
const LBL = 'block text-xs font-medium text-[#A0A0A0] mb-1.5';

export default function ProjectsPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const { getProjectsForWorkspace, addProject } = useProjectStore();
  const projects = getProjectsForWorkspace(workspace.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Project['status']>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setStatus('active');
    setStartDate('');
    setEndDate('');
    setBudget('');
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    addProject({
      workspaceId: workspace.id,
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: budget ? parseFloat(budget) : undefined,
    });
    resetForm();
    setDialogOpen(false);
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{projects.length} projects · {workspace.name}</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors shrink-0"
          style={{ background: accentColor, color: '#0F0F0F' }}
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project, i) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${accentColor}20` }}
                >
                  <FolderOpen className="w-4 h-4" style={{ color: accentColor }} />
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                  style={{
                    background: `${STATUS_COLORS[project.status]}20`,
                    color: STATUS_COLORS[project.status],
                  }}
                >
                  {project.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{project.name}</h3>
              {project.description && (
                <p className="text-xs text-[#A0A0A0] mb-3">{project.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-[#A0A0A0] mt-3 pt-3 border-t border-[#2A2A2A]">
                {project.startDate && <span>Started {project.startDate}</span>}
                {project.budget && (
                  <span className="font-medium" style={{ color: accentColor }}>
                    ${project.budget.toLocaleString()}
                  </span>
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* New Project Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={(e) => { if (e.target === e.currentTarget) { resetForm(); setDialogOpen(false); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-white">New Project</h2>
                <button
                  onClick={() => { resetForm(); setDialogOpen(false); }}
                  className="text-[#6B7280] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={LBL}>Project name *</label>
                  <input
                    className={INP}
                    placeholder="e.g. Spring Lookbook Campaign"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className={LBL}>Description</label>
                  <input
                    className={INP}
                    placeholder="Brief description…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className={LBL}>Status</label>
                  <select className={SEL} value={status} onChange={e => setStatus(e.target.value as Project['status'])}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LBL}>Start date</label>
                    <input
                      type="date"
                      className={INP}
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={LBL}>End date</label>
                    <input
                      type="date"
                      className={INP}
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Budget ($)</label>
                  <input
                    type="number"
                    className={INP}
                    placeholder="0"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { resetForm(); setDialogOpen(false); }}
                  className="flex-1 px-4 py-2 text-sm text-[#A0A0A0] hover:text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: accentColor, color: '#0F0F0F' }}
                >
                  Create Project
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
