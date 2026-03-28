import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM d, yyyy')
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  return isPast(parseISO(dueDate))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getWorkspaceColor(workspaceId: string): string {
  const colors: Record<string, string> = {
    'byron-film': '#D4A017',
    'korus': '#008080',
    'personal': '#F97316',
  }
  return colors[workspaceId] ?? '#6B7280'
}

export function getPriorityColor(priority: string | null | undefined): string {
  const colors: Record<string, string> = {
    urgent: '#EF4444',
    high: '#F59E0B',
    medium: '#3B82F6',
    low: '#6B7280',
  }
  return colors[priority ?? 'medium'] ?? '#6B7280'
}
