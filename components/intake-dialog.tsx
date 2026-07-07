'use client'
import { useState } from 'react'
import { X, Inbox, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkspaceId, IntakeResult, IntakeObjectType } from '@/types'

interface IntakeDialogProps {
  workspaceId: WorkspaceId
  onClose: () => void
  onComplete?: (result: IntakeResult) => void
}

const inputCls = 'w-full px-3 py-2.5 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] text-sm outline-none focus:border-[rgba(167,155,120,0.35)] transition-colors'
const selectCls = `${inputCls} appearance-none`
const labelCls = 'block text-xs text-[#7A6F55] uppercase tracking-wide mb-1.5'

const OBJECT_TYPES: { value: IntakeObjectType | ''; label: string }[] = [
  { value: '', label: 'Auto-detect' },
  { value: 'task', label: 'Task' },
  { value: 'project', label: 'Project' },
  { value: 'event', label: 'Event' },
  { value: 'document_request', label: 'Document Request' },
  { value: 'communication_action', label: 'Communication' },
  { value: 'research_request', label: 'Research' },
]

export function IntakeDialog({ workspaceId, onClose, onComplete }: IntakeDialogProps) {
  const [rawText, setRawText] = useState('')
  const [objectTypeHint, setObjectTypeHint] = useState<IntakeObjectType | ''>('')
  const [sourceType, setSourceType] = useState<'manual' | 'slack'>('manual')
  const [sourceUrl, setSourceUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IntakeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!rawText.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          rawText: rawText.trim(),
          workspaceId,
          objectTypeHint: objectTypeHint || undefined,
          sourceUrl: sourceUrl || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json() as { error: string }
        setError(err.error ?? 'Failed to process intake')
        return
      }
      const data = await res.json() as IntakeResult
      setResult(data)
      onComplete?.(data)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-[rgba(15,11,8,0.7)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#281E16] border border-[rgba(167,155,120,0.22)] sm:rounded-none rounded-t-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(167,155,120,0.13)] shrink-0">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#6E8B7E]" />
            <h2 className="text-sm font-semibold text-[#E8DFCE]">Quick Intake</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-none text-[#7A6F55] hover:text-[#E8DFCE] hover:bg-[rgba(167,155,120,0.13)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {result ? (
            // Success state
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-3 rounded-none bg-[rgba(125,155,94,0.08)] border border-[rgba(125,155,94,0.15)]">
                <span className="text-xs text-[#7D9B5E] font-medium">Created</span>
                <span className="text-xs text-[#A79B78]">{result.objectType}</span>
                {result.isDraft && <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-[rgba(201,150,46,0.15)] text-[#C9962E]">draft</span>}
              </div>
              <p className="text-sm text-[#E8DFCE]">{result.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-[#7A6F55]">
                <span>Confidence: {result.confidence}</span>
                <span>ID: {result.objectId.slice(0, 8)}...</span>
              </div>
            </div>
          ) : (
            // Input state
            <>
              <div>
                <label className={labelCls}>What needs to happen?</label>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Describe the request, task, or action needed..."
                  autoFocus
                  rows={4}
                  className={cn(inputCls, 'resize-none')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select
                    value={objectTypeHint}
                    onChange={e => setObjectTypeHint(e.target.value as IntakeObjectType | '')}
                    className={selectCls}
                  >
                    {OBJECT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Source</label>
                  <select
                    value={sourceType}
                    onChange={e => setSourceType(e.target.value as 'manual' | 'slack')}
                    className={selectCls}
                  >
                    <option value="manual">Manual entry</option>
                    <option value="slack">From Slack</option>
                  </select>
                </div>
              </div>

              {sourceType === 'slack' && (
                <div>
                  <label className={labelCls}>Slack link (optional)</label>
                  <input
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://app.slack.com/..."
                    className={inputCls}
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-[#C0452E]">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[rgba(167,155,120,0.13)] shrink-0">
          {result ? (
            <button onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium bg-[#2F241A] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[rgba(167,155,120,0.18)] transition-colors min-h-[44px]">
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A79B78] hover:text-[#E8DFCE] transition-colors min-h-[44px]">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !rawText.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-[#2F241A] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[rgba(167,155,120,0.18)] disabled:opacity-40 transition-colors min-h-[44px]"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? 'Processing...' : 'Submit'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
