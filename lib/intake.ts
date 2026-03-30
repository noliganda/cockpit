/**
 * Intake Classification & Routing — OPS v5
 *
 * Rules-first classification for incoming requests from Slack/manual sources.
 * Deterministic and inspectable — no AI in this layer yet.
 *
 * Classification targets:
 * - task (default)
 * - project
 * - event
 * - document_request
 * - communication_action
 * - research_request
 */

import type {
  IntakePayload,
  IntakeClassification,
  IntakeObjectType,
  IntakeConfidence,
} from '@/types'

// ── Workspace resolution ─────────────────────────────────────────────────────

const WORKSPACE_ALIASES: Record<string, string> = {
  'byron-film': 'byron-film',
  'byronfilm': 'byron-film',
  'bf': 'byron-film',
  'byron': 'byron-film',
  'korus': 'korus',
  'korus-group': 'korus',
  'personal': 'personal',
  'om': 'personal',
  'oli': 'personal',
}

const DEFAULT_WORKSPACE = 'byron-film'

export function resolveWorkspace(hint?: string): string {
  if (!hint) return DEFAULT_WORKSPACE
  const normalized = hint.toLowerCase().trim()
  return WORKSPACE_ALIASES[normalized] ?? hint
}

// ── Keyword-based object type classification ─────────────────────────────────

interface ClassificationRule {
  objectType: IntakeObjectType
  keywords: string[]
  /** Higher weight = stronger signal */
  weight: number
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // Project signals
  { objectType: 'project', keywords: ['new project', 'start project', 'launch project', 'project proposal', 'project plan', 'project brief'], weight: 3 },
  { objectType: 'project', keywords: ['project:', 'project -', 'initiative'], weight: 2 },

  // Event signals
  { objectType: 'event', keywords: ['schedule meeting', 'book meeting', 'set up call', 'arrange meeting', 'calendar event', 'schedule call', 'meeting with', 'event on', 'event for'], weight: 3 },
  { objectType: 'event', keywords: ['meeting', 'call with', 'appointment'], weight: 1 },

  // Document request signals
  { objectType: 'document_request', keywords: ['create document', 'write document', 'draft document', 'prepare document', 'create report', 'write report', 'prepare brief', 'create brief', 'create proposal', 'write proposal', 'prepare sop', 'write sop'], weight: 3 },
  { objectType: 'document_request', keywords: ['document', 'report', 'brief', 'template', 'sop'], weight: 1 },

  // Communication action signals
  { objectType: 'communication_action', keywords: ['send email', 'email to', 'reply to', 'respond to', 'send message', 'reach out', 'follow up with', 'contact about', 'send invoice', 'chase payment', 'send quote'], weight: 3 },
  { objectType: 'communication_action', keywords: ['email', 'outreach', 'follow up', 'follow-up'], weight: 1 },

  // Research signals
  { objectType: 'research_request', keywords: ['research', 'investigate', 'look into', 'find out', 'analyze', 'analyse', 'competitor analysis', 'market research', 'deep dive'], weight: 2 },
]

interface ClassificationScore {
  objectType: IntakeObjectType
  score: number
}

export function classifyObjectType(text: string, hint?: IntakeObjectType): { objectType: IntakeObjectType; confidence: IntakeConfidence } {
  // If caller provided an explicit hint, trust it
  if (hint) {
    return { objectType: hint, confidence: 'high' }
  }

  const lower = text.toLowerCase()
  const scores: ClassificationScore[] = []

  for (const rule of CLASSIFICATION_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        const existing = scores.find(s => s.objectType === rule.objectType)
        if (existing) {
          existing.score += rule.weight
        } else {
          scores.push({ objectType: rule.objectType, score: rule.weight })
        }
      }
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  if (scores.length === 0) {
    // No strong signal — default to task
    return { objectType: 'task', confidence: 'low' }
  }

  const best = scores[0]
  const confidence: IntakeConfidence = best.score >= 3 ? 'high' : best.score >= 2 ? 'medium' : 'low'

  return { objectType: best.objectType, confidence }
}

// ── Title extraction ─────────────────────────────────────────────────────────

export function extractTitle(rawText: string, explicitTitle?: string): string {
  if (explicitTitle?.trim()) return explicitTitle.trim()

  // Use first line as title, capped at 120 chars
  const firstLine = rawText.split('\n')[0].trim()
  if (firstLine.length <= 120) return firstLine
  return firstLine.slice(0, 117) + '...'
}

// ── Full classification pipeline ─────────────────────────────────────────────

export function classifyIntake(payload: IntakePayload): IntakeClassification {
  const workspaceId = resolveWorkspace(payload.workspaceId)
  const fullText = [payload.title, payload.rawText, payload.description].filter(Boolean).join(' ')
  const { objectType, confidence } = classifyObjectType(fullText, payload.objectTypeHint)
  const title = extractTitle(payload.rawText, payload.title)

  // Low confidence on non-task types → draft to avoid silent misclassification
  const isDraft = confidence === 'low' && objectType !== 'task'

  return {
    objectType,
    confidence,
    title,
    description: payload.description ?? (payload.rawText !== title ? payload.rawText : undefined),
    workspaceId,
    isDraft,
  }
}
