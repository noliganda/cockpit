'use client';

import { motion } from 'framer-motion';
import { Calendar, Tag, User, Trash2, Pencil } from 'lucide-react';
import { Task, getStatusById } from '@/types';
import { format, isPast, parseISO } from 'date-fns';

interface TaskCardProps {
  task: Task;
  workspaceId: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}

const PRIORITY_COLORS = {
  low: '#6B7280',
  medium: '#3B82F6',
  high: '#F59E0B',
  urgent: '#EF4444',
};

export function TaskCard({ task, workspaceId, onEdit, onDelete, isDragging }: TaskCardProps) {
  const status = getStatusById(workspaceId, task.status);
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isDragging ? 0.8 : 1, scale: isDragging ? 1.02 : 1 }}
      className={`bg-[#222222] border rounded-lg p-3 cursor-grab active:cursor-grabbing group ${
        isDragging ? 'border-[#3A3A3A] shadow-xl' : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
      } transition-colors`}
    >
      {/* Priority bar */}
      <div
        className="w-full h-0.5 rounded-full mb-2.5"
        style={{ background: PRIORITY_COLORS[task.priority] }}
      />

      {/* Title + actions */}
      <div className="flex items-start gap-2 mb-2">
        <p className="text-sm text-white font-medium flex-1 leading-snug">{task.title}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#3A3A3A] transition-colors"
          >
            <Pencil className="w-3 h-3 text-[#A0A0A0]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#3A3A3A] transition-colors"
          >
            <Trash2 className="w-3 h-3 text-[#A0A0A0] hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-[#A0A0A0] mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[#2A2A2A] text-[#A0A0A0]"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-[#A0A0A0]">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 mt-2">
        {task.assignee && (
          <div className="flex items-center gap-1 text-xs text-[#A0A0A0]">
            <User className="w-3 h-3" />
            {task.assignee}
          </div>
        )}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1 text-xs ml-auto ${
              isOverdue ? 'text-red-400' : 'text-[#A0A0A0]'
            }`}
          >
            <Calendar className="w-3 h-3" />
            {format(parseISO(task.dueDate), 'MMM d')}
          </div>
        )}
      </div>
    </motion.div>
  );
}
