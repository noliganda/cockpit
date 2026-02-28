'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { TaskDialog } from '@/components/task-dialog';
import { WORKSPACES } from '@/types';
import type { Area, Task, Project } from '@/types';
import { formatRelativeDate, isOverdue, cn } from '@/lib/utils';
import { ArrowLeft, Edit2, Trash2, Calendar, AlertTriangle } from 'lucide-react';

const CORE_AREAS = [
  { name: 'Leadership', color: '#8B5CF6' },
  { name: 'Finances', color: '#22C55E' },
  { name: 'Operations', color: '#3B82F6' },
  { name: 'Growth', color: '#F59E0B' },
  { name: 'Production', color: '#EC4899' },
  { name: 'Service', color: '#008080' },
  { name: 'Sales', color: '#EF4444' },
  { name: 'Marketing', color: '#D4A017' },
];

const STATUS_COLORS: Record<string, string> = {
  Planning: '#3B82F6',
  Active: '#22C55E',
  'On Hold': '#F59E0B',
  Completed: '#6B7280',
  Cancelled: '#EF4444',
  active: '#22C55E',
};

export default function AreaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [area, setArea] = useState<Area | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Area>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [areaRes, tasksRes, projectsRes] = await Promise.all([
        fetch(`/api/areas/${id}`),
        fetch('/api/tasks'),
        fetch('/api/projects'),
      ]);
      const areaData = await areaRes.json();
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      if (areaData.data) {
        setArea(areaData.data);
        setEditForm(areaData.data);
      }
      if (tasksData.data) setTasks(tasksData.data.filter((t: Task) => t.areaId === id));
      if (projectsData.data) setProjects(projectsData.data.filter((p: Project) => p.areaId === id));
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveEdit() {
    if (!area) return;
    setSaving(true);
    const res = await fetch(`/api/areas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, description: editForm.description, color: editForm.color }),
    });
    const data = await res.json();
    if (data.data) setArea(data.data);
    setEditOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this area?')) return;
    setDeleting(true);
    await fetch(`/api/areas/${id}`, { method: 'DELETE' });
    router.push('/areas');
  }

  if (loading) {
    return <div className="text-center py-12 text-sm text-[#6B7280]">Loading area...</div>;
  }
  if (!area) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#6B7280]">Area not found.</p>
        <Link href="/areas"><Button variant="outline" size="sm" className="mt-3">Back to Areas</Button></Link>
      </div>
    );
  }

  const areaColor = area.color ?? (CORE_AREAS.find((a) => a.name === area.name)?.color ?? '#6B7280');
  const ws = WORKSPACES.find((w) => w.id === area.workspaceId);
  const completedTasks = tasks.filter((t) => ['Completed', 'Delivered', 'Paid', 'Won', 'done'].includes(t.status));

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Link href="/areas" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Areas
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: areaColor }} />
            <h1 className="text-2xl font-semibold text-white">{area.name}</h1>
            {ws && (
              <span className="text-xs rounded-full px-2 py-0.5" style={{ backgroundColor: ws.color + '22', color: ws.color }}>
                {ws.icon} {ws.name}
              </span>
            )}
          </div>
          {area.description && <p className="text-sm text-[#A0A0A0] mt-1">{area.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline" size="sm" onClick={handleDelete} disabled={deleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tasks', value: tasks.length },
          { label: 'Completed', value: completedTasks.length },
          { label: 'Projects', value: projects.length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <p className="text-xs text-[#6B7280]">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </Card>
        ))}
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Projects ({projects.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((project) => {
              const sc = STATUS_COLORS[project.status] ?? '#6B7280';
              const pTasks = tasks.filter((t) => t.projectId === project.id);
              const pCompleted = pTasks.filter((t) => ['Completed', 'Delivered', 'Paid', 'Won', 'done'].includes(t.status));
              const progress = pTasks.length > 0 ? Math.round((pCompleted.length / pTasks.length) * 100) : 0;

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#222222] px-3 py-2.5 hover:border-[#3A3A3A] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{project.name}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-[#2A2A2A] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: sc }} />
                        </div>
                        <span className="text-xs text-[#6B7280] w-8 text-right">{progress}%</span>
                      </div>
                    </div>
                    <span className="text-xs shrink-0 rounded-full px-2 py-0.5" style={{ backgroundColor: sc + '22', color: sc }}>
                      {project.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No tasks linked to this area.</p>
          ) : (
            <div className="space-y-1.5">
              {tasks.map((task) => {
                const overdue = task.dueDate ? isOverdue(new Date(task.dueDate)) : false;
                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setTaskDialogOpen(true); }}
                    className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#222222] px-3 py-2 cursor-pointer hover:border-[#3A3A3A] transition-colors"
                  >
                    <span className="flex-1 text-sm text-white truncate">{task.title}</span>
                    <span className="text-xs text-[#6B7280] shrink-0">{task.status}</span>
                    {task.dueDate && (
                      <div className={cn('flex items-center gap-1 text-xs shrink-0', overdue ? 'text-red-400' : 'text-[#6B7280]')}>
                        {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                        {formatRelativeDate(new Date(task.dueDate))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Area</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Name</label>
              <Input value={editForm.name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
              <textarea
                value={editForm.description ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#6B7280] resize-none focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDialog
        task={selectedTask}
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        onSave={(updated) => {
          setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
          setTaskDialogOpen(false);
        }}
        onDelete={(tid) => {
          setTasks((prev) => prev.filter((t) => t.id !== tid));
          setTaskDialogOpen(false);
        }}
      />
    </div>
  );
}
