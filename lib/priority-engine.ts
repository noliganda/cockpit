/**
 * Task Prioritization Engine
 * Deterministic priority scoring algorithm for projects and tasks
 * Based on Eisenhower Matrix + urgency scoring
 */

export type ProjectTier = 1 | 2 | 3 | 4
export type Priority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8'
export type EisenhowerQuadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'
export type EffortLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type BusinessType = 'OM' | 'BF' | 'Korus'
export type ProjectType = 'income' | 'family' | 'hybrid'

export interface ProjectData {
  id: string
  name: string
  business: BusinessType
  projectType: ProjectType
  profitabilityEstimate: number | null
  deadline: Date | null
  percentComplete: number
  status: 'active' | 'paused' | 'complete'
}

export interface TaskData {
  id: string
  title: string
  projectId: string
  status: 'pending' | 'in_progress' | 'complete' | 'blocked'
  dueDate: Date | null
  estimateHours: number
  isBlocking: boolean
  isCriticalPath: boolean
  description?: string
}

export interface ScoredProject extends ProjectData {
  urgencyScore: number
  tier: ProjectTier
}

export interface ScoredTask extends TaskData {
  quadrant: EisenhowerQuadrant
  effort: EffortLevel
  impact: ImpactLevel
  priority: Priority
  rank: number
  daysRemaining: number | null
  parentProject: ScoredProject
  projectTier: ProjectTier
  flags: string[]
}

/**
 * Calculate days remaining until deadline
 */
export function daysUntilDeadline(deadline: Date | null): number | null {
  if (!deadline) return null
  const now = new Date()
  const days = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return days
}

/**
 * Step 1: Calculate project urgency score and tier
 */
export function scoreProject(project: ProjectData, allProjects: ProjectData[]): ScoredProject {
  // Profitability Weight (0-10)
  let profitabilityWeight: number
  if (project.projectType === 'family') {
    profitabilityWeight = 10
  } else if (project.profitabilityEstimate === null) {
    profitabilityWeight = 2
  } else {
    // Rank income projects by profitability
    const incomeProjects = allProjects.filter(p => p.projectType !== 'family' && p.profitabilityEstimate !== null)
    incomeProjects.sort((a, b) => (b.profitabilityEstimate || 0) - (a.profitabilityEstimate || 0))
    const top20 = Math.max(1, Math.ceil(incomeProjects.length * 0.2))
    const top70 = Math.max(1, Math.ceil(incomeProjects.length * 0.7))

    const idx = incomeProjects.findIndex(p => p.id === project.id)
    if (idx < top20) profitabilityWeight = 9 + (idx / top20) * 1 // 9-10
    else if (idx < top70) profitabilityWeight = 5 + ((idx - top20) / (top70 - top20)) * 2 // 5-7
    else profitabilityWeight = 1 + ((idx - top70) / (incomeProjects.length - top70)) * 2 // 1-3
  }

  // Turnaround Weight (0-10)
  const daysRemaining = daysUntilDeadline(project.deadline)
  let turnaroundWeight: number
  if (daysRemaining === null) turnaroundWeight = 2
  else if (daysRemaining < 3) turnaroundWeight = 10
  else if (daysRemaining < 7) turnaroundWeight = 8.5
  else if (daysRemaining < 14) turnaroundWeight = 6.5
  else if (daysRemaining < 30) turnaroundWeight = 4.5
  else turnaroundWeight = 1.5

  // Type Weight (0-10)
  let typeWeight: number
  if (project.projectType === 'family') typeWeight = 10
  else if (project.projectType === 'hybrid') typeWeight = 8
  else if (project.projectType === 'income') {
    if (project.profitabilityEstimate === null) typeWeight = 3
    else {
      const incomeProjects = allProjects.filter(p => p.projectType !== 'family' && p.profitabilityEstimate !== null)
      incomeProjects.sort((a, b) => (b.profitabilityEstimate || 0) - (a.profitabilityEstimate || 0))
      const top20 = Math.max(1, Math.ceil(incomeProjects.length * 0.2))
      const idx = incomeProjects.findIndex(p => p.id === project.id)
      typeWeight = idx < top20 ? 9 : 5
    }
  } else typeWeight = 3

  const urgencyScore = profitabilityWeight * 0.4 + turnaroundWeight * 0.4 + typeWeight * 0.2

  // Assign tier
  let tier: ProjectTier
  if (project.projectType === 'family') tier = 1 // Family minimum TIER 1
  else if (daysRemaining !== null && daysRemaining < 3 && project.percentComplete < 80) tier = 1 // Urgent deadline
  else if (urgencyScore >= 8.5) tier = 1
  else if (urgencyScore >= 6.5) tier = 2
  else if (urgencyScore >= 4.0) tier = 3
  else tier = 4

  return {
    ...project,
    urgencyScore: Math.round(urgencyScore * 10) / 10,
    tier,
  }
}

/**
 * Step 2 & 3: Calculate task quadrant, effort, impact, and priority
 */
export function scoreTask(
  task: TaskData,
  project: ScoredProject
): Omit<ScoredTask, 'rank'> {
  const daysRemaining = daysUntilDeadline(task.dueDate)
  const parentDaysRemaining = daysUntilDeadline(project.deadline)

  // Determine Urgency
  const isUrgent =
    (daysRemaining !== null && daysRemaining < 7) ||
    task.isBlocking ||
    (project.tier === 1 && task.isCriticalPath) ||
    (parentDaysRemaining !== null && parentDaysRemaining < 7 && task.isCriticalPath)

  // Determine Importance
  const isImportant =
    project.tier === 1 ||
    task.isCriticalPath ||
    (project.tier === 2 && task.isBlocking)

  // Eisenhower Quadrant
  const quadrant: EisenhowerQuadrant = isUrgent && isImportant ? 'Q1' : !isUrgent && isImportant ? 'Q2' : isUrgent ? 'Q3' : 'Q4'

  // Effort Level
  const effort: EffortLevel = task.estimateHours < 4 ? 'LOW' : task.estimateHours <= 16 ? 'MEDIUM' : 'HIGH'

  // Impact Level
  const impact: ImpactLevel = project.tier === 1 || task.isCriticalPath || task.isBlocking ? 'HIGH' : project.tier === 2 ? 'MEDIUM' : 'LOW'

  // Calculate Priority (P1-P8)
  let priority: Priority
  if (project.tier === 1 && quadrant === 'Q1') priority = 'P1'
  else if (project.tier === 1 && task.isCriticalPath) priority = 'P1'
  else if (project.projectType === 'family' && quadrant === 'Q1') priority = 'P1'
  else if (task.isBlocking) priority = 'P1' // Blocking tasks are P1
  else if (project.tier === 1 && quadrant === 'Q2') priority = 'P2'
  else if (project.tier === 2 && quadrant === 'Q1') priority = 'P2'
  else if (project.tier === 1 && impact === 'HIGH') priority = 'P2'
  else if (project.projectType === 'family' && quadrant === 'Q2') priority = 'P2'
  else if (project.tier === 2 && quadrant === 'Q2') priority = 'P3'
  else if (project.tier === 2 && task.isCriticalPath && impact !== 'LOW') priority = 'P3'
  else if (project.tier === 1 && quadrant === 'Q3') priority = 'P3'
  else if (project.tier === 3 && quadrant === 'Q1') priority = 'P3'
  else if (project.tier === 2 && quadrant === 'Q3') priority = 'P4'
  else if (project.tier === 3 && quadrant === 'Q2') priority = 'P4'
  else if (project.tier === 1 && quadrant === 'Q4') priority = 'P4'
  else if (project.tier === 3 && quadrant === 'Q3') priority = 'P5'
  else if (project.tier === 2 && quadrant === 'Q4') priority = 'P5'
  else if (effort === 'HIGH' && impact === 'LOW') priority = 'P5'
  else if (project.tier === 3 && quadrant === 'Q4') priority = 'P6'
  else if (project.tier === 4) priority = 'P6'
  else priority = 'P7'

  // Apply tier-based floor/ceiling rules
  if (project.tier === 1 && parseInt(priority[1]) > 3) priority = 'P3'
  if (project.tier === 4 && parseInt(priority[1]) < 4) priority = 'P4'
  if (project.projectType === 'family' && parseInt(priority[1]) > 3) priority = 'P3'

  // Calculate flags
  const flags: string[] = []
  if (project.projectType === 'family') flags.push('FAMILY')
  if (task.isCriticalPath) flags.push('CRITICAL_PATH')
  if (task.isBlocking) flags.push('BLOCKING')
  if (daysRemaining !== null && daysRemaining <= 7) flags.push('DEADLINE_IMMINENT')

  return {
    ...task,
    quadrant,
    effort,
    impact,
    priority,
    daysRemaining,
    parentProject: project,
    projectTier: project.tier,
    flags,
  }
}

/**
 * Step 5: Cross-project ranking
 */
export function rankTasks(tasks: Omit<ScoredTask, 'rank'>[]): ScoredTask[] {
  const priorityOrder: Record<Priority, number> = {
    P1: 1,
    P2: 2,
    P3: 3,
    P4: 4,
    P5: 5,
    P6: 6,
    P7: 7,
    P8: 8,
  }

  return tasks
    .sort((a, b) => {
      // Sort by: P-level, tier, days remaining, blocking status, effort
      const pCmp = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pCmp !== 0) return pCmp

      const tierCmp = a.projectTier - b.projectTier
      if (tierCmp !== 0) return tierCmp

      const aDays = a.daysRemaining ?? 999
      const bDays = b.daysRemaining ?? 999
      const daysCmp = aDays - bDays
      if (daysCmp !== 0) return daysCmp

      const blockingCmp = (b.isBlocking ? 1 : 0) - (a.isBlocking ? 1 : 0)
      if (blockingCmp !== 0) return blockingCmp

      const effortMap = { LOW: 0, MEDIUM: 1, HIGH: 2 }
      return effortMap[a.effort] - effortMap[b.effort]
    })
    .map((task, idx) => ({ ...task, rank: idx + 1 }))
}

/**
 * Main entry point: score and rank all projects and tasks
 */
export function calculatePriorities(projects: ProjectData[], tasks: TaskData[]) {
  // Score all projects
  const scoredProjects = projects.map(p => scoreProject(p, projects))

  // Score all tasks
  const scoredTasks = tasks
    .map(t => {
      const project = scoredProjects.find(p => p.id === t.projectId)
      if (!project) return null
      return scoreTask(t, project)
    })
    .filter((t): t is Omit<ScoredTask, 'rank'> => t !== null)

  // Rank tasks
  const rankedTasks = rankTasks(scoredTasks)

  // Calculate summary stats
  const p1Tasks = rankedTasks.filter(t => t.priority === 'P1').length
  const revenueAtRisk = scoredProjects
    .filter(p => p.tier <= 2 && p.profitabilityEstimate)
    .reduce((sum, p) => sum + (p.profitabilityEstimate || 0), 0)
  const familyProjects = scoredProjects.filter(p => p.projectType === 'family' && p.status === 'active').length
  const blockedTasks = rankedTasks.filter(t => t.status === 'blocked').length

  // Time allocation by tier
  const totalHours = rankedTasks.reduce((sum, t) => sum + t.estimateHours, 0)
  const tier1Hours = rankedTasks.filter(t => t.projectTier === 1).reduce((sum, t) => sum + t.estimateHours, 0)
  const tier2Hours = rankedTasks.filter(t => t.projectTier === 2).reduce((sum, t) => sum + t.estimateHours, 0)
  const tier3Hours = rankedTasks.filter(t => t.projectTier === 3).reduce((sum, t) => sum + t.estimateHours, 0)
  const tier4Hours = rankedTasks.filter(t => t.projectTier === 4).reduce((sum, t) => sum + t.estimateHours, 0)

  return {
    projects: scoredProjects,
    tasks: rankedTasks,
    stats: {
      p1Tasks,
      revenueAtRisk,
      familyProjects,
      blockedTasks,
      timeAllocation: {
        tier1Percent: totalHours > 0 ? Math.round((tier1Hours / totalHours) * 100) : 0,
        tier2Percent: totalHours > 0 ? Math.round((tier2Hours / totalHours) * 100) : 0,
        tier3Percent: totalHours > 0 ? Math.round((tier3Hours / totalHours) * 100) : 0,
        tier4Percent: totalHours > 0 ? Math.round((tier4Hours / totalHours) * 100) : 0,
      },
    },
  }
}
