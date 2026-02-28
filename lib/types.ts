// Default statuses per workspace
export const DEFAULT_STATUSES: Record<string, { id: string; name: string; color: string; order: number }[]> = {
  'byron-film': [
    { id: 'bf-todo', name: 'To Do', color: '#6b7280', order: 0 },
    { id: 'bf-in-progress', name: 'In Progress', color: '#3b82f6', order: 1 },
    { id: 'bf-in-review', name: 'In Review', color: '#f59e0b', order: 2 },
    { id: 'bf-completed', name: 'Completed', color: '#22c55e', order: 3 },
  ],
  'korus': [
    { id: 'ko-todo', name: 'To Do', color: '#6b7280', order: 0 },
    { id: 'ko-in-progress', name: 'In Progress', color: '#14b8a6', order: 1 },
    { id: 'ko-awaiting', name: 'Awaiting Approval', color: '#f59e0b', order: 2 },
    { id: 'ko-completed', name: 'Completed', color: '#22c55e', order: 3 },
  ],
  'private': [
    { id: 'pr-todo', name: 'To Do', color: '#6b7280', order: 0 },
    { id: 'pr-in-progress', name: 'In Progress', color: '#f97316', order: 1 },
    { id: 'pr-completed', name: 'Completed', color: '#22c55e', order: 2 },
  ],
};

// Default areas per workspace
export const DEFAULT_AREAS: Record<string, { id: string; name: string; order: number }[]> = {
  'byron-film': [
    { id: 'bf-production', name: 'Production', order: 0 },
    { id: 'bf-sales', name: 'Sales', order: 1 },
    { id: 'bf-marketing', name: 'Marketing', order: 2 },
    { id: 'bf-operations', name: 'Operations', order: 3 },
  ],
  'korus': [
    { id: 'ko-operations', name: 'Operations', order: 0 },
    { id: 'ko-finances', name: 'Finances', order: 1 },
    { id: 'ko-sales', name: 'Sales', order: 2 },
    { id: 'ko-growth', name: 'Growth', order: 3 },
  ],
  'private': [
    { id: 'pr-admin', name: 'Admin', order: 0 },
    { id: 'pr-personal', name: 'Personal', order: 1 },
  ],
};

// Default tags
export const DEFAULT_TAGS = ['client-facing', 'internal', 'recurring', 'low-effort', 'marketing', 'admin'];
