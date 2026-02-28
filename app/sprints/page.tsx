'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WORKSPACES } from '@/types';
import type { Sprint, Task } from '@/types';
import { formatDate } from '@/lib/utils';
import { Plus, Zap, Calendar } from 'lucide-react';

const SPRINT_STATUS_COLORS: Record<string, string> = {
  planning: '#3B82F6',
  active: '#22C55E',
  completed: '#6B7280',
  Planning: '#3B82F6',
  Active: '#22C55E',
  Completed: '#6B7280',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function SprintsPage() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', workspaceId: 'personal', goal: '', status: 'planning', startDate: '', endDate: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/sprints').then((r) => r.json()),
      fetch('/api/tasks').then((r) => r.json()),
    ]).then(([sprintsData, tasksData]) => {
      if (sprintsData.data) setSprints(sprintsData.data);
      if (tasksData.data) setTasks(tasksData.data);
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/sprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        workspaceId: form.workspaceId,
        goal: form.goal || undefined,
        status: form.status,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }),
    });
    const data = await res.json();
    if (data.data) setSprints((prev) => [data.data, ...prev]);
    setCreateOpen(false);
    setForm({ name: '', workspaceId: 'personal', goal: '', status: 'planning', startDate: '', endDate: '' });
    setSaving(false);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sprints</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{sprints.length} sprints</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Sprint
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-[#6B7280]">Loading sprints...</div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="h-10 w-10 text-[#2A2A2A] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No sprints yet. Create one to plan your work.</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          {sprints.map((sprint) => {
            const sc = SPRINT_STATUS_COLORS[sprint.status] ?? '#6B7280';
            const ws = WORKSPACES.find((w) => w.id === sprint.workspaceId);
            const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
            const completed = sprintTasks.filter((t) =>
              ['Completed', 'Delivered', 'Paid', 'Won', 'done'].includes(t.status)
            );
            const progress = sprintTasks.length > 0 ? Math.round((completed.length / sprintTasks.length) * 100) : 0;

            return (
              <motion.div key={sprint.id} variants={item}>
                <Link href={`/sprints/${sprint.id}`}>
                  <Card className="hover:border-[#3A3A3A] hover:bg-[#202020] transition-all cursor-pointer">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-medium text-white">{sprint.name}</h3>
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                            style={{ backgroundColor: sc + '22', color: sc }}
                          >
                            {sprint.status}
                          </span>
                          {ws && (
                            <span className="text-xs" style={{ color: ws.color }}>{ws.icon} {ws.name}</span>
                          )}
                        </div>
                        {sprint.goal && (
                          <p className="text-sm text-[#A0A0A0] mt-1 line-clamp-1">{sprint.goal}</p>
                        )}
                        {(sprint.startDate || sprint.endDate) && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-[#6B7280]">
                            <Calendar className="h-3.5 w-3.5" />
                            {sprint.startDate ? formatDate(new Date(sprint.startDate), 'MMM d') : '—'}
                            {' → '}
                            {sprint.endDate ? formatDate(new Date(sprint.endDate), 'MMM d, yyyy') : '—'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{sprintTasks.length}</p>
                          <p className="text-xs text-[#6B7280]">tasks</p>
                        </div>
                        {sprintTasks.length > 0 && (
                          <div className="w-20">
                            <div className="h-1.5 rounded-full bg-[#2A2A2A] overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${progress}%`, backgroundColor: sc }}
                              />
                            </div>
                            <p className="text-xs text-[#6B7280] mt-1 text-right">{progress}%</p>
                          </div>
                        )}
                      </div>
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
            <DialogTitle>New Sprint</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Sprint 1, Q1 2026..."
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
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="text-white [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="text-white [color-scheme:dark]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Goal</label>
              <textarea
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="Sprint goal..."
                rows={2}
                className="w-full rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#6B7280] resize-none focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={saving || !form.name.trim()}>
                {saving ? 'Creating...' : 'Create Sprint'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
