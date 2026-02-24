'use client';

import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { MOCK_PROJECTS } from '@/lib/data';

export default function ProjectsPage() {
  const { workspace } = useWorkspace();
  const accentColor = workspace.slug === 'korus' ? '#3B82F6' : '#C8FF3D';
  const projects = MOCK_PROJECTS.filter(p => p.workspaceId === workspace.id);

  const STATUS_COLORS: Record<string, string> = {
    active: '#10B981',
    paused: '#F59E0B',
    completed: '#6B7280',
    archived: '#3A3A3A',
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-white">Projects</h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">{projects.length} projects · {workspace.name}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 hover:border-[#3A3A3A] transition-colors"
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
        ))}
      </div>
    </div>
  );
}
