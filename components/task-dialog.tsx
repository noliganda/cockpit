'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { WORKSPACES } from '@/types';
import type { Task } from '@/types';
import { formatDate } from '@/lib/utils';
import { Trash2, ExternalLink } from 'lucide-react';

interface TaskDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskDialog({ task, open, onClose, onSave, onDelete }: TaskDialogProps) {
  const [form, setForm] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (task) setForm({ ...task });
  }, [task]);

  if (!task) return null;

  const ws = WORKSPACES.find((w) => w.id === task.workspaceId);
  const statuses = ws?.statuses ?? ['todo', 'in-progress', 'done'];

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          assignee: form.assignee,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (data.data) onSave(data.data);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-8">
            {ws && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: ws.color + '22', color: ws.color }}
              >
                {ws.icon} {ws.name}
              </span>
            )}
            {task.notionId && (
              <Badge variant="notion">
                <ExternalLink className="h-3 w-3 mr-1" /> Notion
              </Badge>
            )}
          </div>
          <DialogTitle className="mt-2">
            <Input
              value={form.title ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="text-base font-semibold border-transparent hover:border-[#2A2A2A] focus:border-blue-500 px-0 bg-transparent"
              placeholder="Task title"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Status</label>
              <Select value={form.status ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Priority</label>
              <Select value={form.priority ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'urgent'].map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Assignee</label>
              <Input
                value={form.assignee ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                placeholder="Assignee name"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Due Date</label>
              <Input
                type="date"
                value={form.dueDate ? formatDate(new Date(form.dueDate), 'yyyy-MM-dd') : ''}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value ? new Date(e.target.value) : null }))}
                className="text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add a description..."
              rows={3}
              className="w-full rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-sm text-white placeholder:text-[#6B7280] resize-none focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Tags (display only) */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-[#6B7280] pt-2 border-t border-[#2A2A2A]">
            Created {formatDate(new Date(task.createdAt))} · Updated {formatDate(new Date(task.updatedAt))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
