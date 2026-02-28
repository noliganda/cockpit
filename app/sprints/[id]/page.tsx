'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
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
import { TaskCard } from '@/components/task-card';
import { TaskDialog } from '@/components/task-dialog';
import { WORKSPACES } from '@/types';
import type { Sprint, Task } from '@/types';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit2, Trash2, Calendar } from 'lucide-react';

const SPRINT_STATUS_COLORS: Record<string, string> = {
  planning: '#3B82F6',
  active: '#22C55E',
  completed: '#6B7280',
};

export default function SprintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Sprint & { startDateStr: string; endDateStr: string }>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [sprintRes, tasksRes] = await Promise.all([
        fetch(`/api/sprints/${id}`),
        fetch('/api/tasks'),
      ]);
      const sprintData = await sprintRes.json();
      const tasksData = await tasksRes.json();
      if (sprintData.data) {
        setSprint(sprintData.data);
        setEditForm({
          ...sprintData.data,
          startDateStr: sprintData.data.startDate ? formatDate(new Date(sprintData.data.startDate), 'yyyy-MM-dd') : '',
          endDateStr: sprintData.data.endDate ? formatDate(new Date(sprintData.data.endDate), 'yyyy-MM-dd') : '',
        });
      }
      if (tasksData.data) setTasks(tasksData.data.filter((t: Task) => t.sprintId === id));
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSaveEdit() {
    if (!sprint) return;
    setSaving(true);
    const res = await fetch(`/api/sprints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        goal: editForm.goal,
        status: editForm.status,
        startDate: editForm.startDateStr || undefined,
        endDate: editForm.endDateStr || undefined,
      }),
    });
    const data = await res.json();
    if (data.data) setSprint(data.data);
    setEditOpen(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this sprint?')) return;
    setDeleting(true);
    await fetch(`/api/sprints/${id}`, { method: 'DELETE' });
    router.push('/sprints');
  }

  async function onDragEnd(result: DropResult) {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    setTasks((prev) => prev.map((t) => t.id === draggableId ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  if (loading) return <div className="text-center py-12 text-sm text-[#6B7280]">Loading sprint...</div>;
  if (!sprint) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#6B7280]">Sprint not found.</p>
        <Link href="/sprints"><Button variant="outline" size="sm" className="mt-3">Back to Sprints</Button></Link>
      </div>
    );
  }

  const ws = WORKSPACES.find((w) => w.id === sprint.workspaceId);
  const statuses = ws?.statuses ?? ['To Do', 'In Progress', 'Completed'];
  const sc = SPRINT_STATUS_COLORS[sprint.status] ?? '#6B7280';
  const completedTasks = tasks.filter((t) => ['Completed', 'Delivered', 'Paid', 'Won', 'done'].includes(t.status));
  const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const tasksByStatus: Record<string, Task[]> = {};
  statuses.forEach((s) => { tasksByStatus[s] = []; });
  tasks.forEach((t) => {
    if (tasksByStatus[t.status]) tasksByStatus[t.status].push(t);
    else tasksByStatus[statuses[0]].push(t);
  });

  return (
    <div className="max-w-full space-y-5">
      <Link href="/sprints" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Sprints
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-white">{sprint.name}</h1>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize" style={{ backgroundColor: sc + '22', color: sc }}>
              {sprint.status}
            </span>
            {ws && <span className="text-xs" style={{ color: ws.color }}>{ws.icon} {ws.name}</span>}
          </div>
          {sprint.goal && <p className="text-sm text-[#A0A0A0] mt-1">{sprint.goal}</p>}
          {(sprint.startDate || sprint.endDate) && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#6B7280]">
              <Calendar className="h-3.5 w-3.5" />
              {sprint.startDate ? formatDate(new Date(sprint.startDate), 'MMM d') : '—'}
              {' → '}
              {sprint.endDate ? formatDate(new Date(sprint.endDate), 'MMM d, yyyy') : '—'}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-1.5" />Edit
          </Button>
          <Button
            variant="outline" size="sm" onClick={handleDelete} disabled={deleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-900/30"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />{deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tasks', value: tasks.length },
          { label: 'Completed', value: completedTasks.length },
          { label: 'Progress', value: `${progress}%` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <p className="text-xs text-[#6B7280]">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </Card>
        ))}
      </div>

      {/* Mini kanban */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-[#6B7280] text-center py-4">No tasks in this sprint. Assign tasks to this sprint from the Tasks page.</p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {statuses.map((status) => {
              const colTasks = tasksByStatus[status] ?? [];
              return (
                <div key={status} className="shrink-0 w-60">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ws?.color ?? '#6B7280' }} />
                      <span className="text-xs font-medium text-[#A0A0A0]">{status}</span>
                    </div>
                    <span className="text-xs text-[#6B7280]">{colTasks.length}</span>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-20 rounded-xl border border-[#2A2A2A] p-2 space-y-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-[#222222] border-[#3A3A3A]' : 'bg-[#161616]'
                        }`}
                      >
                        {colTasks.map((task, idx) => (
                          <Draggable key={task.id} draggableId={task.id} index={idx}>
                            {(drag, dragSnapshot) => (
                              <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps}>
                                <TaskCard task={task} onClick={() => { setSelectedTask(task); setTaskDialogOpen(true); }} dragging={dragSnapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-3 text-xs text-[#6B7280]">Drop here</div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Sprint</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Name</label>
              <Input value={editForm.name ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Status</label>
              <Select value={editForm.status ?? ''} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Start Date</label>
                <Input type="date" value={editForm.startDateStr ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, startDateStr: e.target.value }))} className="[color-scheme:dark]" />
              </div>
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">End Date</label>
                <Input type="date" value={editForm.endDateStr ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, endDateStr: e.target.value }))} className="[color-scheme:dark]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Goal</label>
              <textarea
                value={editForm.goal ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, goal: e.target.value }))}
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
        onSave={(updated) => { setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t)); setTaskDialogOpen(false); }}
        onDelete={(tid) => { setTasks((prev) => prev.filter((t) => t.id !== tid)); setTaskDialogOpen(false); }}
      />
    </div>
  );
}
