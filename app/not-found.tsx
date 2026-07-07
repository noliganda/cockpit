import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1A1410] flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-[rgba(167,155,120,0.13)] font-mono mb-4">404</p>
        <h1 className="text-xl font-semibold text-[#E8DFCE] mb-2">Page not found</h1>
        <p className="text-sm text-[#7A6F55] mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard"
          className="px-4 py-2 text-sm font-medium bg-[#281E16] border border-[rgba(167,155,120,0.22)] text-[#E8DFCE] rounded-none hover:bg-[#2F241A] transition-colors">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
