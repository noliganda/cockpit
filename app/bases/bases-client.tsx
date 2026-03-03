'use client'

export default function BasesClient() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Bases</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Spreadsheets &amp; databases</p>
        </div>
      </div>

      <div className="bg-[#1A1A2E] border border-[#2D2D44] rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🗄️</div>
        <h2 className="text-lg font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-[#6B7280] max-w-md mx-auto">
          Bases will provide spreadsheet-style databases for internal data tracking.
          We&apos;re evaluating the best approach for this feature.
        </p>
      </div>
    </div>
  )
}
