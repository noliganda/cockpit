'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ArrowLeft, Plus, Calendar, Target, Search, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { format, parseISO } from 'date-fns';
import { useWorkspace, getWorkspaceColor } from '@/hooks/use-workspace';
import { useSprintStore } from '@/stores/sprint-store';
import { useTaskStore } from '@/stores/task-store';
import { useProjectStore } from '@/stores/project-store';
import { TaskDialog } from '@/components/task-dialog';
import { Task, TASK_STATUSES } from '@/types';

const PRIORITY_COLORS: Record<string, string> = { low: '#6B7280', medium: '#3B82F6', high: '#F59E0B', urgent: '#EF4444' };
const SPRINT_STATUS_COLORS: Record<string, string> = { planning: '#6B7280', active: '#10B981', completed: '#6366F1' };

export default function SprintBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { sprints, addTaskToSprint, removeTaskFromSprint } = useSprintStore();
  const { tasks, getTasksForWorkspace, addTask, updateTask, deleteTask } = useTaskStore();
  const { projects } = useProjectStore();

  const sprint = sprints.find(s => s.id === id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  if (!sprint) {
    return (
      <div className="p-6"><div className="text-center py-20">
        <p className="text-[#A0A0A0] text-sm mb-3">Sprint not found</p>
        <Link href="/sprints" className="text-xs font-medium inline-flex items-center gap-1 hover:opacity-80" style={{ color: accentColor }}><ArrowLeft className="w-3.5 h-3.5" />Back to Sprints</Link>
      </div></div>
    );
  }

  const sprintTaskIds = new Set(sprint.taskIds);
  const sprintTasks = tasks.filter(t => sprintTaskIds.has(t.id));
  const allWorkspaceTasks = getTasksForWorkspace(workspace.id);
  const backlogTasks = allWorkspaceTasks
    .filter(t => !sprintTaskIds.has(t.id))
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .filter(t => statusFilter === 'all' || t.status === statusFilter);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Backlog → Sprint column
    if (source.droppableId === 'backlog' && destination.droppableId.startsWith('sprint-')) {
      const newStatus = destination.droppableId.replace('sprint-', '');
      addTaskToSprint(sprint.id, draggableId);
      updateTask(draggableId, { status: newStatus });
    }
    // Sprint column → Backlog
    else if (source.droppableId.startsWith('sprint-') && destination.droppableId === 'backlog') {
      removeTaskFromSprint(sprint.id, draggableId);
    }
    // Sprint column → Sprint column (move status)
    else if (source.droppableId.startsWith('sprint-') && destination.droppableId.startsWith('sprint-')) {
      const newStatus = destination.droppableId.replace('sprint-', '');
      updateTask(draggableId, { status: newStatus });
    }
  };

  const handleSave = (td: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTask) {
      updateTask(editingTask.id, td);
    } else {
      const newTask = addTask(td);
      addTaskToSprint(sprint.id, newTask.id);
    }
    setEditingTask(undefined);
  };

  const workspaceProjects = projects.filter(p => p.workspaceId === workspace.id);

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 shrink-0">
        <Link href="/sprints" className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-white mb-3 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All Sprints
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{sprint.name}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium capitalize" style={{ background: `${SPRINT_STATUS_COLORS[sprint.status]}20`, color: SPRINT_STATUS_COLORS[sprint.status] }}>{sprint.status}</span>
            </div>
            {sprint.goal && (
              <div className="flex items-center gap-1.5 mt-1"><Target className="w-3.5 h-3.5 text-[#6B7280]" /><p className="text-sm text-[#A0A0A0]">{sprint.goal}</p></div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
              <p className="text-xs text-[#6B7280]">{format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d, yyyy')} · {sprintTasks.length} tasks</p>
            </div>
          </div>
          <button onClick={() => { setEditingTask(undefined); setDialogOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg" style={{ background: accentColor, color: '#0F0F0F' }}>
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </motion.div>

      {/* Split Layout */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 overflow-hidden">

          {/* LEFT: Backlog */}
          <div className="w-[280px] shrink-0 flex flex-col bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#2A2A2A]">
              <p className="text-xs font-semibold text-white mb-2">All Tasks</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter tasks..." className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#3A3A3A]" />
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                <button onClick={() => setStatusFilter('all')} className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${statusFilter === 'all' ? 'bg-[#3A3A3A] text-white' : 'text-[#6B7280] hover:text-[#A0A0A0]'}`}>All</button>
                {TASK_STATUSES.map(s => (
                  <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${statusFilter === s.id ? 'text-white' : 'text-[#6B7280] hover:text-[#A0A0A0]'}`} style={statusFilter === s.id ? { background: `${s.color}30`, color: s.color } : {}}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto p-2 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? 'bg-[#252525]' : ''}`}>
                  {backlogTasks.length === 0 ? (
                    <p className="text-xs text-[#6B7280] text-center py-8">No tasks to add</p>
                  ) : backlogTasks.map((task, i) => (
                    <Draggable key={task.id} draggableId={task.id} index={i}>
                      {(prov, snap) => (
                        <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${snap.isDragging ? 'bg-[#2A2A2A] border-[#3A3A3A] shadow-lg' : 'bg-[#222] border-[#2A2A2A] hover:border-[#3A3A3A]'}`}>
                          <GripVertical className="w-3 h-3 text-[#3A3A3A] shrink-0" />
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{task.title}</p>
                            {task.assignee && <p className="text-[10px] text-[#6B7280] mt-0.5">{task.assignee}</p>}
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TASK_STATUSES.find(s => s.id === task.status)?.color || '#6B7280' }} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* RIGHT: Sprint Kanban */}
          <div className="flex-1 flex gap-3 overflow-x-auto pb-2">
            {TASK_STATUSES.map((status, ci) => {
              const col = sprintTasks.filter(t => t.status === status.id);
              return (
                <div key={status.id} className="flex-shrink-0 w-[220px] flex flex-col">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
                    <span className="text-xs font-semibold text-white">{status.name}</span>
                    <span className="text-[10px] text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">{col.length}</span>
                  </div>
                  <Droppable droppableId={`sprint-${status.id}`}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 rounded-xl p-2 space-y-2 min-h-[120px] transition-colors border border-dashed ${snapshot.isDraggingOver ? 'bg-[#1E1E1E] border-[#3A3A3A]' : 'bg-transparent border-transparent'}`}>
                        {col.map((task, i) => (
                          <Draggable key={task.id} draggableId={task.id} index={i}>
                            {(prov, snap) => (
                              <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps} className={`rounded-lg p-3 group transition-colors ${snap.isDragging ? 'bg-[#2A2A2A] border-[#3A3A3A] shadow-lg border' : 'bg-[#222] border border-[#2A2A2A] hover:border-[#3A3A3A]'}`}>
                                <div className="w-full h-0.5 rounded-full mb-2" style={{ background: PRIORITY_COLORS[task.priority] }} />
                                <p className="text-xs text-white font-medium leading-snug mb-1.5">{task.title}</p>
                                {task.description && <p className="text-[10px] text-[#6B7280] line-clamp-2 mb-2">{task.description}</p>}
                                <div className="flex items-center justify-between">
                                  {task.assignee && <span className="text-[10px] text-[#6B7280]">{task.assignee}</span>}
                                  {task.dueDate && <span className="text-[10px] text-[#6B7280]">{format(parseISO(task.dueDate), 'MMM d')}</span>}
                                </div>
                                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingTask(task); setDialogOpen(true); }} className="px-1.5 py-0.5 text-[10px] text-[#A0A0A0] hover:text-white hover:bg-[#3A3A3A] rounded">Edit</button>
                                  <button onClick={() => removeTaskFromSprint(sprint.id, task.id)} className="px-1.5 py-0.5 text-[10px] text-[#A0A0A0] hover:text-orange-400 hover:bg-[#3A3A3A] rounded">Remove</button>
                                  <button onClick={() => deleteTask(task.id)} className="px-1.5 py-0.5 text-[10px] text-[#A0A0A0] hover:text-red-400 hover:bg-[#3A3A3A] rounded">Delete</button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {col.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-[10px] text-[#3A3A3A] text-center py-6">Drop tasks here</p>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(undefined); }}
        onSave={handleSave}
        workspaceId={workspace.id}
        initialTask={editingTask}
        projects={workspaceProjects}
        accentColor={accentColor}
      />
    </div>
  );
}
