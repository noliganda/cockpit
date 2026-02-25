export interface Workspace {
  id: string;
  name: string;
  slug: 'byron-film' | 'korus';
  color: string;
  icon: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  projectId?: string;
  areaId?: string;
  sprintId?: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  impact?: 'low' | 'medium' | 'high';
  effort?: 'low' | 'medium' | 'high';
  duration?: string;
  urgent?: boolean;
  important?: boolean;
  dueDate?: string;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  areaId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}

export interface Area {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
}

export interface Contact {
  id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  address?: string;
  website?: string;
  notes?: string;
  pipelineStage?: string;
  tags: string[];
  lastContact?: string;
}

export interface FileItem {
  id: string;
  workspaceId: string;
  name: string;
  type: 'folder' | 'pdf' | 'doc' | 'video' | 'image' | 'spreadsheet' | 'audio' | 'zip';
  parentId: string | null;
  size?: number; // bytes
  modifiedAt: string;
  starred?: boolean;
  owner?: string;
}

export interface Sprint {
  id: string;
  workspaceId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  taskIds: string[];
  createdAt: string;
}

export interface TaskStatus {
  id: string;
  name: string;
  color: string;
}

export const BYRON_FILM_STATUSES: TaskStatus[] = [
  { id: 'backlog', name: 'Backlog', color: '#6B7280' },
  { id: 'pre-prod', name: 'Pre-Production', color: '#8B5CF6' },
  { id: 'in-prod', name: 'In Production', color: '#F59E0B' },
  { id: 'post-prod', name: 'Post-Production', color: '#3B82F6' },
  { id: 'review', name: 'Review', color: '#EC4899' },
  { id: 'delivered', name: 'Delivered', color: '#10B981' },
  { id: 'invoiced', name: 'Invoiced', color: '#6366F1' },
  { id: 'paid', name: 'Paid', color: '#C8FF3D' },
];

export const KORUS_STATUSES: TaskStatus[] = [
  { id: 'lead', name: 'Lead', color: '#6B7280' },
  { id: 'qualification', name: 'Qualification', color: '#8B5CF6' },
  { id: 'proposal', name: 'Proposal', color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', color: '#3B82F6' },
  { id: 'won', name: 'Won', color: '#10B981' },
  { id: 'lost', name: 'Lost', color: '#EF4444' },
  { id: 'on-hold', name: 'On Hold', color: '#EC4899' },
];

export const WORKSPACES: Workspace[] = [
  { id: 'byron-film', name: 'Byron Film', slug: 'byron-film', color: '#C8FF3D', icon: '🎬' },
  { id: 'korus', name: 'KORUS Group', slug: 'korus', color: '#3B82F6', icon: '🏢' },
];

export function getStatusesForWorkspace(workspaceId: string): TaskStatus[] {
  return workspaceId === 'korus' ? KORUS_STATUSES : BYRON_FILM_STATUSES;
}

export function getStatusById(workspaceId: string, statusId: string): TaskStatus | undefined {
  return getStatusesForWorkspace(workspaceId).find(s => s.id === statusId);
}
