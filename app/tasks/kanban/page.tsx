'use client';

import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TaskCard } from '@/components/task-card';
import { TaskDialog } from '@/components/task-dialog';
import { WORKSPACES } from '@/types';
import type { Task } from '@/types';
import Link from 'next/link';
import { List } from 'lucide-react';

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState('personal');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const ws = WORKSPACES.find((w) => w.id === workspace)!;
  const statuses = ws.statuses;

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tasks?workspace=${workspace}`);
    const data = await res.json();
    if (data.data) setTasks(data.data);
    setLoading(false);
  }, [workspace]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    setTasks((prev) =>
      prev.map((t) => t.id === draggableId ? { ...t, status: newStatus } : t)
    );

    await fetch(`/api/tasks/${draggableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  function openTask(task: Task) {
    setSelectedTask(task);
    setDialogOpen(true);
  }

  function handleSave(updated: Task) {
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDialogOpen(false);
  }

  const tasksByStatus: Record<string, Task[]> = {};
  statuses.forEach((s) => { tasksByStatus[s] = []; });
  tasks.forEach((t) => {
    if (tasksByStatus[t.status]) {
      tasksByStatus[t.status].push(t);
    } else {
      // put in first column if status doesn't match current workspace
      tasksByStatus[statuses[0]].push(t);
    }
  });

  return (
    <div className="max-w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-white">Kanban Board</h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">{tasks.length} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={workspace} onValueChange={setWorkspace}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKSPACES.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              <List className="h-4 w-4 mr-1.5" />
              List
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-[#6B7280]">Loading tasks...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {statuses.map((status) => {
              const columnTasks = tasksByStatus[status] ?? [];
              return (
                <div key={status} className="shrink-0 w-64">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ws.color }}
                      />
                      <span className="text-xs font-medium text-[#A0A0A0]">{status}</span>
                    </div>
                    <span className="text-xs text-[#6B7280] tabular-nums">{columnTasks.length}</span>
                  </div>

                  {/* Droppable column */}
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-24 rounded-xl border border-[#2A2A2A] p-2 space-y-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-[#222222] border-[#3A3A3A]' : 'bg-[#161616]'
                        }`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  onClick={() => openTask(task)}
                                  dragging={dragSnapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-4 text-xs text-[#6B7280]">
                            Drop here
                          </div>
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

      <TaskDialog
        task={selectedTask}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
