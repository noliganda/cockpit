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

/**
 * Extract workspace hint from raw message text.
 * Checks for explicit workspace prefixes/tags before channel-based fallback.
 *
 * Supported patterns:
 *   - "korus: do this", "korus | do this", "korus - do this", "[korus] do this"
 *   - "for korus: ...", "for byron film: ...", "for bf: ..."
 *   - "#korus", "#bf", "#om"
 *   - KORUS, BF, OM (uppercase shorthand)
 */
export function extractWorkspaceFromText(text: string): string | undefined {
  const t = text.toLowerCase().trim()

  // Bracket prefix: [korus], [bf], [om]
  const bracketMatch = t.match(/^\[([a-z\s-]+)\]/)
  if (bracketMatch) {
    const resolved = WORKSPACE_ALIASES[bracketMatch[1].trim()]
    if (resolved) return resolved
  }

  // Explicit "for X:" or "for X -" patterns
  const forMatch = t.match(/^for\s+([a-z\s-]+?)[\s:|-]/)
  if (forMatch) {
    const resolved = WORKSPACE_ALIASES[forMatch[1].trim()]
    if (resolved) return resolved
  }

  // Prefix patterns: "korus:", "bf -", "om |"
  const prefixMatch = t.match(/^([a-z]+(?:\s[a-z]+)?)\s*[:|-]/)
  if (prefixMatch) {
    const resolved = WORKSPACE_ALIASES[prefixMatch[1].trim()]
    if (resolved) return resolved
  }

  // Hashtag hint: #korus, #bf, #om
  const tagMatch = t.match(/#([a-z]+(?:-[a-z]+)*)/)
  if (tagMatch) {
    const resolved = WORKSPACE_ALIASES[tagMatch[1].trim()]
    if (resolved) return resolved
  }

  return undefined
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

// ── AI-assisted classification prompt ─────────────────────────────────────────
const AI_CLASSIFIER_SYSTEM_PROMPT = `
You are an intake classifier for a business operations system.
Classify the incoming message into the correct operational object type and workspace.

Available object types:
- task: a concrete piece of work to be done
- project: a larger initiative with multiple tasks and a timeline
- event: a meeting, call, appointment, or time-based item
- document_request: a request to create a document, report, or written artifact
- communication_action: an email, message, or outreach action
- research_request: a request to research, analyse, or investigate something

Available workspaces:
- byron-film: video production, shoots, clients, content, Byron Film
- korus: commercial fit-out, KORUS Group, construction, Singapore, Australia, France
- personal: personal tasks, Olivier Marcolin, family, personal admin

Return a JSON object only, no explanation:
{
  "objectType": "task|project|event|document_request|communication_action|research_request",
  "workspaceId": "byron-film|korus|personal|null",
  "title": "short clear title for the task",
  "confidence": "high|medium|low",
  "isDraft": false
}

Set isDraft to true only if the request is very ambiguous or unclear.
Set workspaceId to null if you cannot determine the workspace.
`;

/**
 * Call OpenAI to classify intake, returns parsed classification
 */
async function classifyWithAI(
  rawText: string,
  objectTypeHint?: IntakeObjectType,
  workspaceIdHint?: string,
): Promise<{ objectType: IntakeObjectType; workspaceId: string | null; title: string; confidence: IntakeConfidence; isDraft: boolean }> {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OpenAI API key');
  const messages = [
    { role: 'system', content: AI_CLASSIFIER_SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify({ text: rawText, objectTypeHint, workspaceIdHint }) },
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature: 0, max_tokens: 500 }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI');
  return JSON.parse(content);
}
// ── Full classification pipeline ─────────────────────────────────────────────

export async function classifyIntake(payload: IntakePayload): Promise<IntakeClassification> {
  // Resolve initial workspace hint
  const resolvedWorkspace = resolveWorkspace(payload.workspaceId)
  // Combine text inputs for keyword fallback
  const fullText = [payload.title, payload.rawText, payload.description].filter(Boolean).join(' ')

  // 1. If explicit objectTypeHint, trust keyword classifier
  if (payload.objectTypeHint) {
    const { objectType, confidence } = classifyObjectType(fullText, payload.objectTypeHint)
    const title = extractTitle(payload.rawText, payload.title)
    const isDraft = confidence === 'low' && objectType !== 'task'
    return {
      objectType,
      confidence,
      title,
      description: payload.description ?? (payload.rawText !== title ? payload.rawText : undefined),
      workspaceId: resolvedWorkspace,
      isDraft,
      classifierUsed: 'keyword',
    }
  }

  // 2. Try AI-assisted classification when API key is set
  if (process.env.OPENAI_API_KEY) {
    try {
      const ai = await classifyWithAI(payload.rawText, payload.objectTypeHint, payload.workspaceId)
      if (ai.confidence === 'high' || ai.confidence === 'medium') {
        const title = ai.title
        const workspaceId = ai.workspaceId ?? resolvedWorkspace
        return {
          objectType: ai.objectType,
          confidence: ai.confidence,
          title,
          description: payload.description ?? (payload.rawText !== title ? payload.rawText : undefined),
          workspaceId,
          isDraft: ai.isDraft,
          classifierUsed: 'ai',
        }
      }
    } catch {
      // Silent fallback to keyword classifier on any error
    }
  }

  // 3. Keyword fallback
  const { objectType, confidence } = classifyObjectType(fullText, payload.objectTypeHint)
  const title = extractTitle(payload.rawText, payload.title)
  const isDraft = confidence === 'low' && objectType !== 'task'
  return {
    objectType,
    confidence,
    title,
    description: payload.description ?? (payload.rawText !== title ? payload.rawText : undefined),
    workspaceId: resolvedWorkspace,
    isDraft,
    classifierUsed: 'keyword',
  }
}
