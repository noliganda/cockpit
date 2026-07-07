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
    case 'high': return 'text-[#7D9B5E] bg-[rgba(125,155,94,0.12)]'
    case 'medium': return 'text-[#C9962E] bg-[rgba(201,150,46,0.12)]'
    case 'low': return 'text-[#C0452E] bg-[rgba(192,69,46,0.12)]'
    default: return 'text-[#7A6F55] bg-[rgba(167,155,120,0.13)]'
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
          <Inbox className="w-5 h-5 text-[#6E8B7E]" />
          <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Intake Review</h1>
          {filter === 'pending' && items.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(192,69,46,0.12)] text-[#C0452E] font-medium">
              {items.length} pending
            </span>
          )}
        </div>
        <button
          onClick={() => void fetchItems()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#7A6F55] hover:text-[#E8DFCE] bg-[#281E16] border border-[rgba(167,155,120,0.13)] rounded-none transition-colors"
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
              'px-3 py-1.5 text-xs rounded-none border transition-colors',
              filter === f
                ? 'bg-[#2F241A] border-[rgba(167,155,120,0.22)] text-[#E8DFCE]'
                : 'border-[rgba(167,155,120,0.13)] text-[#7A6F55] hover:text-[#A79B78]',
            )}
          >
            {f === 'pending' ? 'Needs Review' : f === 'approved' ? 'Reviewed' : 'All'}
          </button>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <p className="text-sm text-[#5C5340] py-12 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Inbox className="w-8 h-8 text-[#4A4234] mx-auto mb-3" />
          <p className="text-sm text-[#5C5340]">
            {filter === 'pending' ? 'No items need review' : 'No items found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-none bg-[#211913] border border-[rgba(167,155,120,0.13)] p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-[#C9962E] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  {/* Title + badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-[#E8DFCE] truncate">
                      {item.entityTitle ?? 'Untitled'}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', confidenceColor(item.metadata?.confidence))}>
                      {item.metadata?.confidence ?? '?'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(167,155,120,0.13)] text-[#A79B78]">
                      {objectTypeLabel(item.metadata?.objectType)}
                    </span>
                    {item.metadata?.isDraft && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(201,150,46,0.12)] text-[#C9962E]">draft</span>
                    )}
                  </div>

                  {/* Review reason */}
                  <p className="text-xs text-[#7A6F55] mb-2">{reviewReason(item)}</p>

                  {/* Source + context row */}
                  <div className="flex items-center gap-3 text-[10px] text-[#5C5340] flex-wrap">
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
                        className="flex items-center gap-1 text-xs text-[#6E8B7E] hover:text-[#6E8B7E] transition-colors"
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
                        className="flex items-center gap-1 text-xs text-[#7A6F55] hover:text-[#A79B78] transition-colors"
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
                      className="w-8 h-8 flex items-center justify-center rounded-none text-[#7D9B5E] hover:bg-[rgba(125,155,94,0.12)] transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => void markReviewed(item.id, 'rejected')}
                      title="Dismiss"
                      className="w-8 h-8 flex items-center justify-center rounded-none text-[#7A6F55] hover:text-[#C0452E] hover:bg-[rgba(192,69,46,0.08)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {item.approvalStatus === 'approved' && (
                  <span className="text-[10px] text-[#7D9B5E] px-2 py-0.5 rounded-full bg-[rgba(125,155,94,0.08)]">
                    Reviewed{item.approvedBy ? ` by ${item.approvedBy}` : ''}
                  </span>
                )}
                {item.approvalStatus === 'rejected' && (
                  <span className="text-[10px] text-[#7A6F55] px-2 py-0.5 rounded-full bg-[rgba(167,155,120,0.09)]">
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
