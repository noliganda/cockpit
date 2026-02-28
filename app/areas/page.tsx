'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WORKSPACES } from '@/types';
import type { Area, Task, Project } from '@/types';
import { Target, Plus } from 'lucide-react';

const CORE_AREAS = [
  { name: 'Leadership', color: '#8B5CF6', icon: '👑' },
  { name: 'Finances', color: '#22C55E', icon: '💰' },
  { name: 'Operations', color: '#3B82F6', icon: '⚙️' },
  { name: 'Growth', color: '#F59E0B', icon: '📈' },
  { name: 'Production', color: '#EC4899', icon: '🎬' },
  { name: 'Service', color: '#008080', icon: '🤝' },
  { name: 'Sales', color: '#EF4444', icon: '💼' },
  { name: 'Marketing', color: '#D4A017', icon: '📣' },
];

function areaColor(area: Area) {
  return area.color ?? (CORE_AREAS.find((a) => a.name === area.name)?.color ?? '#6B7280');
}
function areaIcon(area: Area) {
  return CORE_AREAS.find((a) => a.name === area.name)?.icon ?? '📁';
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', workspaceId: 'personal', description: '', color: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/areas').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/projects').then((r) => r.json()),
    ]).then(([areasData, tasksData, projectsData]) => {
      if (areasData.data) setAreas(areasData.data);
      if (tasksData.data) setTasks(tasksData.data);
      if (projectsData.data) setProjects(projectsData.data);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        workspaceId: form.workspaceId,
        description: form.description || undefined,
        color: form.color || undefined,
        order: areas.length,
      }),
    });
    const data = await res.json();
    if (data.data) setAreas((prev) => [...prev, data.data]);
    setCreateOpen(false);
    setForm({ name: '', workspaceId: 'personal', description: '', color: '' });
    setSaving(false);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Areas</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{areas.length} areas · 8 Core Concepts</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Area
        </Button>
      </div>

      {/* Core Concepts hint */}
      <div className="flex flex-wrap gap-1.5">
        {CORE_AREAS.map((ca) => (
          <span
            key={ca.name}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border border-[#2A2A2A] text-[#6B7280]"
          >
            {ca.icon} {ca.name}
          </span>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-[#6B7280]">Loading areas...</div>
      ) : areas.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-10 w-10 text-[#2A2A2A] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No areas yet. Create one to organise your work.</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {areas.map((area) => {
            const color = areaColor(area);
            const icon = areaIcon(area);
            const ws = WORKSPACES.find((w) => w.id === area.workspaceId);
            const areaTasks = tasks.filter((t) => t.areaId === area.id);
            const areaProjects = projects.filter((p) => p.areaId === area.id);

            return (
              <motion.div key={area.id} variants={item}>
                <Link href={`/areas/${area.id}`}>
                  <Card className="hover:border-[#3A3A3A] hover:bg-[#202020] transition-all cursor-pointer h-full overflow-hidden">
                    {/* Colored left border */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                      style={{ backgroundColor: color }}
                    />
                    <div className="pl-3">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{icon}</span>
                          <CardTitle className="text-base">{area.name}</CardTitle>
                        </div>
                        {area.description && (
                          <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{area.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                          <span>{areaTasks.length} tasks</span>
                          <span>{areaProjects.length} projects</span>
                          {ws && <span style={{ color: ws.color }}>{ws.icon}</span>}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Operations, Growth..."
                autoFocus
                list="core-areas"
              />
              <datalist id="core-areas">
                {CORE_AREAS.map((a) => <option key={a.name} value={a.name} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Workspace</label>
              <Select value={form.workspaceId} onValueChange={(v) => setForm((f) => ({ ...f, workspaceId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORKSPACES.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
                className="w-full rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#6B7280] resize-none focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving || !form.name.trim()}>
                {saving ? 'Creating...' : 'Create Area'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
