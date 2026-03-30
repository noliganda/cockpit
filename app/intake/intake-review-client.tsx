'use client'
import { useState, useEffect, useCallback } from 'react'
import { Inbox, Check, X, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReviewItem {
  id: string
  workspaceId: string
  entityType: string
  entityId: string | null
  entityTitle: string | null
  description: string | null
  metadata: {
    objectType?: string
    confidence?: string
    isDraft?: boolean
    sourceType?: string
    sourceChannel?: string
    sourceUrl?: string
    parentTaskId?: string | null
    needsReview?: boolean
  } | null
  eventType: string | null
  actorName: string | null
  sourceSystem: string | null
  approvalStatus: string
  approvedBy: string | null
  createdAt: string
}

function confidenceColor(confidence?: string) {
  switch (confidence) {
    case 'high': return 'text-[#22C55E] bg-[rgba(34,197,94,0.12)]'
    case 'medium': return 'text-[#F59E0B] bg-[rgba(245,158,11,0.12)]'
    case 'low': return 'text-[#EF4444] bg-[rgba(239,68,68,0.12)]'
    default: return 'text-[#6B7280] bg-[rgba(255,255,255,0.06)]'
  }
}

function objectTypeLabel(type?: string) {
  switch (type) {
    case 'task': return 'Task'
    case 'project': return 'Project'
    case 'event': return 'Event'
    case 'document_request': return 'Document'
    case 'communication_action': return 'Communication'
    case 'research_request': return 'Research'
    default: return type ?? 'Unknown'
  }
}

function reviewReason(item: ReviewItem): string {
  const meta = item.metadata
  if (!meta) return 'Unknown reason'
  if (meta.isDraft) return 'Low-confidence classification (created as draft)'
  if (meta.confidence === 'low') return 'Low classification confidence'
  if (meta.confidence === 'medium') return 'Medium classification confidence'
  return 'Flagged for review'
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function IntakeReviewClient() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/intake/review?status=${filter}`)
      if (res.ok) {
        const data = await res.json() as ReviewItem[]
        setItems(data)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void fetchItems() }, [fetchItems])

  async function markReviewed(id: string, status: 'approved' | 'rejected') {
    const res = await fetch('/api/intake/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, approvalStatus: status }),
    })
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Inbox className="w-5 h-5 text-[#60A5FA]" />
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Intake Review</h1>
          {filter === 'pending' && items.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.12)] text-[#EF4444] font-medium">
              {items.length} pending
            </span>
          )}
        </div>
        <button
          onClick={() => void fetchItems()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#6B7280] hover:text-[#F5F5F5] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] rounded-[6px] transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-5">
        {(['pending', 'approved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-[6px] border transition-colors',
              filter === f
                ? 'bg-[#222222] border-[rgba(255,255,255,0.10)] text-[#F5F5F5]'
                : 'border-[rgba(255,255,255,0.06)] text-[#6B7280] hover:text-[#A0A0A0]',
            )}
          >
            {f === 'pending' ? 'Needs Review' : f === 'approved' ? 'Reviewed' : 'All'}
          </button>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <p className="text-sm text-[#4B5563] py-12 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Inbox className="w-8 h-8 text-[#374151] mx-auto mb-3" />
          <p className="text-sm text-[#4B5563]">
            {filter === 'pending' ? 'No items need review' : 'No items found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Title + badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-[#F5F5F5] truncate">
                      {item.entityTitle ?? 'Untitled'}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', confidenceColor(item.metadata?.confidence))}>
                      {item.metadata?.confidence ?? '?'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.06)] text-[#A0A0A0]">
                      {objectTypeLabel(item.metadata?.objectType)}
                    </span>
                    {item.metadata?.isDraft && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(245,158,11,0.12)] text-[#F59E0B]">draft</span>
                    )}
                  </div>

                  {/* Review reason */}
                  <p className="text-xs text-[#6B7280] mb-2">{reviewReason(item)}</p>

                  {/* Source + context row */}
                  <div className="flex items-center gap-3 text-[10px] text-[#4B5563] flex-wrap">
                    <span>Source: {item.metadata?.sourceType ?? item.sourceSystem}</span>
                    {item.metadata?.sourceChannel && <span>Channel: {item.metadata.sourceChannel}</span>}
                    <span>Workspace: {item.workspaceId}</span>
                    <span>{formatTime(item.createdAt)}</span>
                    {item.actorName && <span>By: {item.actorName}</span>}
                  </div>

                  {/* Links */}
                  <div className="flex items-center gap-2 mt-2">
                    {item.entityId && (
                      <a
                        href={item.entityType === 'project'
                          ? `/projects/${item.entityId}?workspace=${item.workspaceId}`
                          : `/tasks?workspace=${item.workspaceId}`}
                        className="flex items-center gap-1 text-xs text-[#60A5FA] hover:text-[#93C5FD] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View {objectTypeLabel(item.metadata?.objectType)}
                      </a>
                    )}
                    {item.metadata?.sourceUrl && (
                      <a
                        href={item.metadata.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#A0A0A0] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Source
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {item.approvalStatus === 'pending' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => void markReviewed(item.id, 'approved')}
                      title="Mark reviewed"
                      className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#22C55E] hover:bg-[rgba(34,197,94,0.12)] transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void markReviewed(item.id, 'rejected')}
                      title="Dismiss"
                      className="w-8 h-8 flex items-center justify-center rounded-[6px] text-[#6B7280] hover:text-[#EF4444] hover:bg-[rgba(239,68,68,0.08)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {item.approvalStatus === 'approved' && (
                  <span className="text-[10px] text-[#22C55E] px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.08)]">
                    Reviewed{item.approvedBy ? ` by ${item.approvedBy}` : ''}
                  </span>
                )}
                {item.approvalStatus === 'rejected' && (
                  <span className="text-[10px] text-[#6B7280] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)]">
                    Dismissed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
