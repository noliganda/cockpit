'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { TaskDialog } from '@/components/task-dialog';
import { WORKSPACES } from '@/types';
import type { Project, Task } from '@/types';
import { formatDate, formatRelativeDate, isOverdue, cn } from '@/lib/utils';
import { ArrowLeft, Edit2, Trash2, CheckSquare, Calendar, AlertTriangle } from 'lucide-react';

const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const STATUS_COLORS: Record<string, string> = {
  Planning: '#3B82F6',
  Active: '#22C55E',
  'On Hold': '#F59E0B',
  Completed: '#6B7280',
  Cancelled: '#EF4444',
  active: '#22C55E',
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');

  useEffect(() => {
    async function load() {
      const [projRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/tasks`),
      ]);
      const projData = await projRes.json();
      const tasksData = await tasksRes.json();
      if (projData.data) {
        setProject(projData.data);
        setEditForm(projData.data);
      }
      if (tasksData.data) {
        setTasks(tasksData.data.filter((t: Task) => t.projectId === id));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveEdit() {
    if (!project) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
        region: editForm.region,
      }),
    });
    const data = await res.json();
    if (data.data) setProject(data.data);
    setEditOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this project?')) return;
    setDeleting(true);
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/projects');
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-12 text-sm text-[#6B7280]">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="text-center py-12">
          <p className="text-sm text-[#6B7280]">Project not found.</p>
          <Link href="/projects">
            <Button variant="outline" size="sm" className="mt-3">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  const ws = WORKSPACES.find((w) => w.id === project.workspaceId);
  const sc = STATUS_COLORS[project.status] ?? '#6B7280';
  const completedTasks = tasks.filter((t) => ['Completed', 'Delivered', 'Paid', 'Won', 'done'].includes(t.status));
  const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter((t) =>
    !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back nav */}
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: sc + '22', color: sc }}
            >
              {project.status}
            </span>
            {ws && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: ws.color + '22', color: ws.color }}
              >
                {ws.icon} {ws.name}
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-sm text-[#A0A0A0] mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-1.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks', value: tasks.length, icon: CheckSquare },
          { label: 'Completed', value: completedTasks.length, icon: CheckSquare },
          { label: 'Progress', value: `${progress}%`, icon: CheckSquare },
          { label: 'Due Date', value: project.endDate ? formatDate(new Date(project.endDate), 'MMM d, yyyy') : '—', icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[#6B7280] shrink-0" />
              <div>
                <p className="text-xs text-[#6B7280]">{label}</p>
                <p className="text-base font-semibold text-white">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-[#2A2A2A] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, backgroundColor: sc }}
                />
              </div>
              <span className="text-sm font-medium text-white w-10 text-right">{progress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Tasks ({tasks.length})</CardTitle>
            <Input
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-48 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No tasks linked to this project.</p>
          ) : (
            <div className="space-y-1.5">
              {filteredTasks.map((task) => {
                const overdue = task.dueDate ? isOverdue(new Date(task.dueDate)) : false;
                const pc = task.priority ? PRIORITY_COLORS[task.priority] ?? '#6B7280' : '#6B7280';
                return (
                  <div
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setTaskDialogOpen(true); }}
                    className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#222222] px-3 py-2.5 cursor-pointer hover:border-[#3A3A3A] transition-colors"
                  >
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: pc }} />
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
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Name</label>
              <Input
                value={editForm.name ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Status</label>
              <Select value={editForm.status ?? ''} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
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
