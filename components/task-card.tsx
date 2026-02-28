'use client';

import type { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate, isOverdue } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Calendar, AlertTriangle } from 'lucide-react';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#6B7280',
};

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  dragging?: boolean;
}

export function TaskCard({ task, onClick, dragging }: TaskCardProps) {
  const overdue = task.dueDate ? isOverdue(new Date(task.dueDate)) : false;
  const priorityColor = task.priority ? PRIORITY_COLORS[task.priority] ?? '#6B7280' : '#6B7280';

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] p-3 cursor-pointer transition-colors',
        dragging ? 'opacity-50 rotate-1' : 'hover:border-[#3A3A3A] hover:bg-[#222222]'
      )}
    >
      {/* Priority dot + title */}
      <div className="flex items-start gap-2">
        <div
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: priorityColor }}
        />
        <p className="text-sm text-white leading-snug line-clamp-2">{task.title}</p>
      </div>

      {/* Meta row */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Assignee initial */}
          {task.assignee && (
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2A2A2A] text-[10px] font-medium text-[#A0A0A0]">
              {task.assignee.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Tags */}
          {task.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} className="text-[10px] px-1.5 py-0">{tag}</Badge>
          ))}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className={cn('flex items-center gap-1 text-[10px] shrink-0', overdue ? 'text-red-400' : 'text-[#6B7280]')}>
            {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
            {formatRelativeDate(new Date(task.dueDate))}
          </div>
        )}
      </div>
    </div>
  );
}
