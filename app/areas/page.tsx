'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Layers } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { useAreaStore } from '@/stores/area-store';
import { useProjectStore } from '@/stores/project-store';
import { getWorkspaceColor } from '@/hooks/use-workspace';
import { Area } from '@/types';

const PRESET_COLORS = [
  '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#EF4444', '#6366F1', '#14B8A6',
  '#F97316', '#84CC16', '#06B6D4', '#A78BFA',
];

const INP = 'w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A] transition-colors';
const LBL = 'block text-xs font-medium text-[#A0A0A0] mb-1.5';

type DialogMode = 'create' | 'edit';

interface AreaDialog {
  mode: DialogMode;
  area?: Area;
  name: string;
  description: string;
  color: string;
}

const BLANK: AreaDialog = { mode: 'create', name: '', description: '', color: '#3B82F6' };

export default function AreasPage() {
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { getAreasForWorkspace, addArea, updateArea, deleteArea } = useAreaStore();
  const { getProjectsForWorkspace } = useProjectStore();

  const areas = getAreasForWorkspace(workspace.id);
  const projects = getProjectsForWorkspace(workspace.id);

  const [dialog, setDialog] = useState<AreaDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null);

  const openCreate = () => setDialog({ ...BLANK, color: accentColor });

  const openEdit = (area: Area) =>
    setDialog({ mode: 'edit', area, name: area.name, description: area.description ?? '', color: area.color });

  const handleSave = () => {
    if (!dialog || !dialog.name.trim()) return;
    if (dialog.mode === 'create') {
      addArea({ workspaceId: workspace.id, name: dialog.name.trim(), description: dialog.description.trim() || undefined, color: dialog.color });
    } else if (dialog.area) {
      updateArea(dialog.area.id, { name: dialog.name.trim(), description: dialog.description.trim() || undefined, color: dialog.color });
    }
    setDialog(null);
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteArea(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-bold text-white">Areas</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">
            {areas.length} area{areas.length !== 1 ? 's' : ''} · {workspace.name}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ background: accentColor, color: '#0F0F0F' }}
        >
          <Plus className="w-4 h-4" />
          New Area
        </button>
      </motion.div>

      {/* Area cards */}
      {areas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-48 bg-[#1A1A1A] border border-dashed border-[#2A2A2A] rounded-xl"
        >
          <Layers className="w-8 h-8 text-[#3A3A3A] mb-2" />
          <p className="text-sm text-[#A0A0A0]">No areas yet</p>
          <button onClick={openCreate} className="mt-3 text-xs font-medium" style={{ color: accentColor }}>
            + Create your first area
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area, i) => {
            const areaProjects = projects.filter(p => p.areaId === area.id);
            return (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5 group hover:border-[#3A3A3A] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${area.color}20` }}
                    >
                      <Layers className="w-4.5 h-4.5" style={{ color: area.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{area.name}</h3>
                      {area.description && (
                        <p className="text-xs text-[#A0A0A0] mt-0.5 line-clamp-1">{area.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(area)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(area)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-red-400 hover:bg-[#2A2A2A] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Color swatch + project count */}
                <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: area.color }} />
                    <span className="text-xs text-[#6B7280]">{area.color}</span>
                  </div>
                  <span className="text-xs text-[#A0A0A0]">
                    {areaProjects.length} project{areaProjects.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Projects in this area */}
                {areaProjects.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {areaProjects.slice(0, 4).map(p => (
                      <span
                        key={p.id}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${area.color}15`, color: area.color }}
                      >
                        {p.name}
                      </span>
                    ))}
                    {areaProjects.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2A2A] text-[#6B7280]">
                        +{areaProjects.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <AnimatePresence>
        {dialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={e => { if (e.target === e.currentTarget) setDialog(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-white">
                  {dialog.mode === 'create' ? 'New Area' : 'Edit Area'}
                </h2>
                <button onClick={() => setDialog(null)} className="text-[#6B7280] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={LBL}>Name *</label>
                  <input
                    className={INP}
                    placeholder="e.g. Production, Sales, R&D"
                    value={dialog.name}
                    onChange={e => setDialog(d => d && { ...d, name: e.target.value })}
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  />
                </div>
                <div>
                  <label className={LBL}>Description</label>
                  <input
                    className={INP}
                    placeholder="Optional description…"
                    value={dialog.description}
                    onChange={e => setDialog(d => d && { ...d, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LBL}>Color</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setDialog(d => d && { ...d, color: c })}
                        className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: c,
                          outline: dialog.color === c ? `2px solid white` : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={dialog.color}
                      onChange={e => setDialog(d => d && { ...d, color: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                      title="Custom color"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDialog(null)}
                  className="flex-1 px-4 py-2 text-sm text-[#A0A0A0] hover:text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!dialog.name.trim()}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: accentColor, color: '#0F0F0F' }}
                >
                  {dialog.mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            >
              <h2 className="text-base font-semibold text-white mb-2">Delete area?</h2>
              <p className="text-sm text-[#A0A0A0] mb-5">
                <span className="text-white">{deleteTarget.name}</span> will be removed. Projects in this area won&apos;t be deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2 text-sm text-[#A0A0A0] hover:text-white bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
