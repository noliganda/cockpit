'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl font-bold text-[rgba(255,255,255,0.06)] font-mono mb-4">Error</p>
        <h1 className="text-lg font-semibold text-[#F5F5F5] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#6B7280] mb-6">{error.message ?? 'An unexpected error occurred.'}</p>
        <button onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors">
          Try again
        </button>
      </div>
    </div>
  )
}
