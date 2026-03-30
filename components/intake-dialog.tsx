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

const inputCls = 'w-full px-3 py-2.5 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] text-sm outline-none focus:border-[rgba(255,255,255,0.16)] transition-colors'
const selectCls = `${inputCls} appearance-none`
const labelCls = 'block text-xs text-[#6B7280] uppercase tracking-wide mb-1.5'

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] sm:rounded-[12px] rounded-t-[16px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)] shrink-0">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#60A5FA]" />
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Quick Intake</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#F5F5F5] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {result ? (
            // Success state
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-3 rounded-[6px] bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.15)]">
                <span className="text-xs text-[#22C55E] font-medium">Created</span>
                <span className="text-xs text-[#A0A0A0]">{result.objectType}</span>
                {result.isDraft && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(245,158,11,0.15)] text-[#F59E0B]">draft</span>}
              </div>
              <p className="text-sm text-[#F5F5F5]">{result.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
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
                <p className="text-xs text-[#EF4444]">{error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[rgba(255,255,255,0.06)] shrink-0">
          {result ? (
            <button onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] transition-colors min-h-[44px]">
              Done
            </button>
          ) : (
            <>
              <button onClick={onClose} className="px-4 py-2.5 text-sm text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors min-h-[44px]">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !rawText.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-[#222222] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-40 transition-colors min-h-[44px]"
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
