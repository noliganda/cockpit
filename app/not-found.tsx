import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-[rgba(255,255,255,0.06)] font-mono mb-4">404</p>
        <h1 className="text-xl font-semibold text-[#F5F5F5] mb-2">Page not found</h1>
        <p className="text-sm text-[#6B7280] mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard"
          className="px-4 py-2 text-sm font-medium bg-[#1A1A1A] border border-[rgba(255,255,255,0.10)] text-[#F5F5F5] rounded-[6px] hover:bg-[#222222] transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
