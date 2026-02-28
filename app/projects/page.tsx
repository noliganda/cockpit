'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WORKSPACES } from '@/types';
import type { Project } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, FolderOpen } from 'lucide-react';

const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const REGION_FLAGS: Record<string, string> = {
  SG: '🇸🇬',
  AU: '🇦🇺',
  FR: '🇫🇷',
  global: '🌏',
};

const STATUS_COLORS: Record<string, string> = {
  Planning: '#3B82F6',
  Active: '#22C55E',
  'On Hold': '#F59E0B',
  Completed: '#6B7280',
  Cancelled: '#EF4444',
  active: '#22C55E',
  completed: '#6B7280',
};

function statusColor(s: string) {
  return STATUS_COLORS[s] ?? '#6B7280';
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

interface CreateProjectForm {
  name: string;
  workspaceId: string;
  status: string;
  region: string;
  description: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterWorkspace, setFilterWorkspace] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateProjectForm>({
    name: '', workspaceId: 'personal', status: 'Active', region: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => { if (d.data) setProjects(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const allRegions = Array.from(new Set(projects.map((p) => p.region).filter(Boolean))) as string[];

  const filtered = projects.filter((p) => {
    if (filterRegion !== 'all' && p.region !== filterRegion) return false;
    if (filterWorkspace !== 'all' && p.workspaceId !== filterWorkspace) return false;
    return true;
  });

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        workspaceId: form.workspaceId,
        status: form.status,
        region: form.region || undefined,
        description: form.description || undefined,
      }),
    });
    const data = await res.json();
    if (data.data) setProjects((prev) => [data.data, ...prev]);
    setCreateOpen(false);
    setForm({ name: '', workspaceId: 'personal', status: 'Active', region: '', description: '' });
    setSaving(false);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{filtered.length} projects</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-[#6B7280]">Filter:</span>
        {/* Workspace filter */}
        <button
          onClick={() => setFilterWorkspace('all')}
          className={`text-xs rounded-full px-3 py-1 border transition-colors ${
            filterWorkspace === 'all'
              ? 'bg-[#2A2A2A] border-[#3A3A3A] text-white'
              : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white'
          }`}
        >
          All
        </button>
        {WORKSPACES.map((w) => (
          <button
            key={w.id}
            onClick={() => setFilterWorkspace(filterWorkspace === w.id ? 'all' : w.id)}
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              filterWorkspace === w.id
                ? 'border-transparent text-white'
                : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white'
            }`}
            style={filterWorkspace === w.id ? { backgroundColor: w.color + '33', borderColor: w.color } : {}}
          >
            {w.icon} {w.name}
          </button>
        ))}
        {/* Region filter chips */}
        {allRegions.map((region) => (
          <button
            key={region}
            onClick={() => setFilterRegion(filterRegion === region ? 'all' : region)}
            className={`text-xs rounded-full px-3 py-1 border transition-colors ${
              filterRegion === region
                ? 'bg-[#2A2A2A] border-[#3A3A3A] text-white'
                : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white'
            }`}
          >
            {REGION_FLAGS[region] ?? '🌐'} {region}
          </button>
        ))}
      </div>

      {/* Project grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-[#6B7280]">Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="h-10 w-10 text-[#2A2A2A] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((project) => {
            const ws = WORKSPACES.find((w) => w.id === project.workspaceId);
            const sc = statusColor(project.status);
            return (
              <motion.div key={project.id} variants={item}>
                <Link href={`/projects/${project.id}`}>
                  <Card className="hover:border-[#3A3A3A] hover:bg-[#202020] transition-all cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{project.name}</CardTitle>
                          {project.description && (
                            <p className="text-xs text-[#6B7280] mt-1 line-clamp-2">{project.description}</p>
                          )}
                        </div>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                          style={{ backgroundColor: sc + '22', color: sc }}
                        >
                          {project.status}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-[#6B7280]">
                        <div className="flex items-center gap-2">
                          {ws && (
                            <span style={{ color: ws.color }}>{ws.icon} {ws.name}</span>
                          )}
                          {project.region && (
                            <span>{REGION_FLAGS[project.region] ?? '🌐'} {project.region}</span>
                          )}
                        </div>
                        {project.endDate && (
                          <span>Due {formatDate(new Date(project.endDate), 'MMM d')}</span>
                        )}
                      </div>
                      {/* Progress bar placeholder */}
                      <div className="mt-3 h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: project.status === 'Completed' ? '100%' : project.status === 'Active' ? '50%' : '10%',
                            backgroundColor: sc,
                          }}
                        />
                      </div>
                    </CardContent>
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
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Project name"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
                <label className="text-xs text-[#6B7280] mb-1 block">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Region</label>
              <Select value={form.region || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, region: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No region</SelectItem>
                  {Object.entries(REGION_FLAGS).map(([k, flag]) => (
                    <SelectItem key={k} value={k}>{flag} {k}</SelectItem>
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
                {saving ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
