// Task Grouping Logic
// Groups tasks by property, returns ordered groups with labels + counts.

export type GroupingProperty = 'none' | 'project' | 'status' | 'assignee' | 'area'

export const GROUPING_OPTIONS: { value: GroupingProperty; label: string }[] = [
  { value: 'none',     label: 'No grouping' },
  { value: 'project',  label: 'Project' },
  { value: 'status',   label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'area',     label: 'Area' },
]

export interface TaskGroup<T> {
  key: string
  label: string
  count: number
  tasks: T[]
}

/**
 * Group an array of tasks by a computed key function.
 * Returns groups in insertion order with an "Ungrouped" fallback.
 */
export function groupTasksBy<T>(
  tasks: T[],
  keyFn: (task: T) => string,
): TaskGroup<T>[] {
  const map = new Map<string, T[]>()

  for (const task of tasks) {
    const key = keyFn(task) || 'Ungrouped'
    const arr = map.get(key)
    if (arr) {
      arr.push(task)
    } else {
      map.set(key, [task])
    }
  }

  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: key,
    count: items.length,
    tasks: items,
  }))
}
