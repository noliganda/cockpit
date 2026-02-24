'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { Task, TaskStatus } from '@/types';
import { TaskCard } from '@/components/task-card';
import { motion } from 'framer-motion';

interface KanbanBoardProps {
  tasks: Task[];
  statuses: TaskStatus[];
  workspaceId: string;
  accentColor: string;
  onMoveTask: (taskId: string, newStatus: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (status: string) => void;
}

export function KanbanBoard({
  tasks,
  statuses,
  workspaceId,
  accentColor,
  onMoveTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    if (destination.droppableId !== result.source.droppableId) {
      onMoveTask(draggableId, destination.droppableId);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {statuses.map((status, colIndex) => {
          const columnTasks = tasks.filter(t => t.status === status.id);
          return (
            <motion.div
              key={status.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: colIndex * 0.04 }}
              className="flex-shrink-0 w-[260px] flex flex-col"
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: status.color }}
                  />
                  <span className="text-xs font-semibold text-white">{status.name}</span>
                  <span className="text-xs text-[#A0A0A0] bg-[#2A2A2A] px-1.5 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => onAddTask(status.id)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#2A2A2A] transition-colors text-[#A0A0A0] hover:text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Droppable column */}
              <Droppable droppableId={status.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 rounded-lg min-h-[120px] p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-[#1A1A1A]' : 'bg-transparent'
                    }`}
                    style={{
                      borderWidth: snapshot.isDraggingOver ? 1 : 0,
                      borderStyle: 'solid',
                      borderColor: snapshot.isDraggingOver ? status.color + '40' : 'transparent',
                    }}
                  >
                    {columnTasks.map((task, taskIndex) => (
                      <Draggable key={task.id} draggableId={task.id} index={taskIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <TaskCard
                              task={task}
                              workspaceId={workspaceId}
                              onEdit={onEditTask}
                              onDelete={onDeleteTask}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Add card button */}
                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <button
                        onClick={() => onAddTask(status.id)}
                        className="w-full py-3 rounded-lg border border-dashed border-[#2A2A2A] text-xs text-[#6B7280] hover:text-[#A0A0A0] hover:border-[#3A3A3A] transition-colors"
                      >
                        + Add task
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </motion.div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
