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
    'byron-film': '#C99A1F',
    'korus': '#3E7A70',
    'personal': '#C96F2E',
  }
  return colors[workspaceId] ?? '#7A6F55'
}

export function getPriorityColor(priority: string | null | undefined): string {
  const colors: Record<string, string> = {
    urgent: '#C0452E',
    high: '#C9962E',
    medium: '#5F7A72',
    low: '#7A6F55',
  }
  return colors[priority ?? 'medium'] ?? '#7A6F55'
}
