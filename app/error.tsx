'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#14100C] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <p className="text-4xl font-bold text-[rgba(167,155,120,0.13)] font-mono mb-4">Error</p>
        <h1 className="text-lg font-semibold text-[#E8DFCE] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#7A6F55] mb-6">{error.message ?? 'An unexpected error occurred.'}</p>
        <button onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-[#201A14] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#272018] transition-colors">
          Try again
        </button>
      </div>
    </div>
  )
}
