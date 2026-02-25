'use client';

import { useState, use } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useWorkspace } from '@/hooks/use-workspace';
import { useSprintStore } from '@/stores/sprint-store';
import { useTaskStore } from '@/stores/task-store';
import { getStatusesForWorkspace } from '@/types';
import { getWorkspaceColor } from '@/hooks/use-workspace';

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export default function SprintPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workspace } = useWorkspace();
  const accentColor = getWorkspaceColor(workspace.id);
  const { sprints, addTaskToSprint, removeTaskFromSprint } = useSprintStore();
  const { getTasksForWorkspace, updateTask } = useTaskStore();
  const statuses = getStatusesForWorkspace(workspace.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const sprint = sprints.find(s => s.id === id);

  if (!sprint) {
    return (
      <div className="p-6">
        <div className="text-center py-20">
          <p className="text-[#A0A0A0] text-sm mb-3">Sprint not found</p>
          <Link href="/sprints" className="text-xs font-medium hover:opacity-80" style={{ color: accentColor }}>
            ← Back to Sprints
          </Link>
        </div>
      </div>
    );
  }

  const workspaceTasks = getTasksForWorkspace(workspace.id);
  const sprintTaskIds = new Set(sprint.taskIds);
  const sprintTasks = workspaceTasks.filter(t => sprintTaskIds.has(t.id));
  const backlogTasks = workspaceTasks.filter(t => !sprintTaskIds.has(t.id));

  const filteredBacklog = backlogTasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, source, destination } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const fromBacklog = source.droppableId === 'backlog';
    const toBacklog = destination.droppableId === 'backlog';

    if (fromBacklog && !toBacklog) {
      // Add to sprint, set status to destination column
      addTaskToSprint(sprint.id, draggableId);
      updateTask(draggableId, { status: destination.droppableId });
    } else if (!fromBacklog && toBacklog) {
      // Remove from sprint
      removeTaskFromSprint(sprint.id, draggableId);
    } else if (!fromBacklog && !toBacklog) {
      // Move between sprint columns → update status
      updateTask(draggableId, { status: destination.droppableId });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 shrink-0">
        <Link
          href={`/sprints/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#A0A0A0] hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sprint board
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Plan: {sprint.name}</h1>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Drag tasks from backlog into the sprint · {sprint.taskIds.length} task{sprint.taskIds.length !== 1 ? 's' : ''} planned
            </p>
          </div>
          <div
            className="text-xs px-2.5 py-1 rounded-full font-medium capitalize"
            style={{ background: `${accentColor}20`, color: accentColor }}
          >
            {sprint.status}
          </div>
        </div>
      </div>

      {/* Split layout */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 px-6 pb-6 overflow-hidden min-h-0">

          {/* Left: Backlog */}
          <div className="w-[280px] shrink-0 flex flex-col bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="p-3 border-b border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-semibold text-white">Backlog</span>
                <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">
                  {filteredBacklog.length}
                </span>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B7280]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks…"
                  className="w-full pl-7 pr-3 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#3A3A3A]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none appearance-none"
              >
                <option value="all">All statuses</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex-1 overflow-y-auto p-2 space-y-1.5"
                  style={{
                    background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  {filteredBacklog.map((task, i) => (
                    <Draggable key={task.id} draggableId={task.id} index={i}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className="bg-[#222222] border border-[#2A2A2A] rounded-lg p-2.5 cursor-grab active:cursor-grabbing select-none"
                          style={{
                            ...prov.draggableProps.style,
                            borderColor: snap.isDragging ? accentColor : undefined,
                            boxShadow: snap.isDragging ? `0 4px 16px rgba(0,0,0,0.4)` : undefined,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ background: PRIORITY_COLORS[task.priority] }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white leading-snug truncate">{task.title}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                                  style={{
                                    background: `${statuses.find(s => s.id === task.status)?.color ?? '#6B7280'}20`,
                                    color: statuses.find(s => s.id === task.status)?.color ?? '#6B7280',
                                  }}
                                >
                                  {statuses.find(s => s.id === task.status)?.name ?? task.status}
                                </span>
                                <span
                                  className="text-[10px] capitalize"
                                  style={{ color: PRIORITY_COLORS[task.priority] }}
                                >
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {filteredBacklog.length === 0 && !snapshot.isDraggingOver && (
                    <p className="text-xs text-[#6B7280] text-center py-8">
                      {backlogTasks.length === 0 ? 'All tasks are in the sprint' : 'No matching tasks'}
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Right: Sprint kanban */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 h-full" style={{ minWidth: `${statuses.length * 208}px` }}>
              {statuses.map((status, colIndex) => {
                const columnTasks = sprintTasks.filter(t => t.status === status.id);
                return (
                  <motion.div
                    key={status.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: colIndex * 0.04 }}
                    className="w-[200px] shrink-0 flex flex-col bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#2A2A2A]">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: status.color }} />
                      <span className="text-xs font-semibold text-white flex-1 truncate">{status.name}</span>
                      <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full shrink-0">
                        {columnTasks.length}
                      </span>
                    </div>

                    <Droppable droppableId={status.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[60px]"
                          style={{
                            background: snapshot.isDraggingOver ? `${status.color}12` : 'transparent',
                          }}
                        >
                          {columnTasks.map((task, i) => (
                            <Draggable key={task.id} draggableId={task.id} index={i}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  className="bg-[#222222] border border-[#2A2A2A] rounded-lg p-2.5 group cursor-grab active:cursor-grabbing select-none"
                                  style={{
                                    ...prov.draggableProps.style,
                                    borderColor: snap.isDragging ? status.color : undefined,
                                    boxShadow: snap.isDragging ? `0 4px 16px rgba(0,0,0,0.4)` : undefined,
                                  }}
                                >
                                  <div
                                    className="w-full h-0.5 rounded-full mb-2"
                                    style={{ background: PRIORITY_COLORS[task.priority] }}
                                  />
                                  <p className="text-xs font-medium text-white leading-snug mb-1.5">{task.title}</p>
                                  {task.assignee && (
                                    <p className="text-[10px] text-[#6B7280] mb-1">{task.assignee}</p>
                                  )}
                                  <button
                                    onMouseDown={e => e.stopPropagation()}
                                    onClick={e => {
                                      e.stopPropagation();
                                      removeTaskFromSprint(sprint.id, task.id);
                                    }}
                                    className="text-[10px] text-[#6B7280] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all leading-none"
                                  >
                                    Remove ×
                                  </button>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                            <div className="h-10 border border-dashed border-[#2A2A2A] rounded-lg flex items-center justify-center">
                              <span className="text-[10px] text-[#4A4A4A]">Drop here</span>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </DragDropContext>
    </div>
  );
}
