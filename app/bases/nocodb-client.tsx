'use client'
import { ExternalLink, Database, Terminal, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface NocoDBClientProps {
  url: string | null
}

export function NocoDBClient({ url }: NocoDBClientProps) {
  const [copied, setCopied] = useState(false)

  function copyCmd() {
    const cmd = `docker run -d \\
  --name nocodb \\
  --restart unless-stopped \\
  -p 8080:8080 \\
  -e NC_DB="pg://ep-jolly-grass-a7ffwvsd-pooler.ap-southeast-2.aws.neon.tech:5432?u=neondb_owner&p=npg_jyxJkq7F4oCW&d=neondb&ssl.rejectUnauthorized=false" \\
  -e NC_AUTH_JWT_SECRET="$(openssl rand -hex 32)" \\
  -v nocodb_data:/usr/app/data/ \\
  nocodb/nocodb:latest`
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    toast.success('Copied Docker command')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!url) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-[#6B7280]" />
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Bases</h1>
        </div>

        <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)] mb-4">
          <p className="text-sm font-semibold text-[#F5F5F5] mb-2">NocoDB not configured</p>
          <p className="text-sm text-[#6B7280] mb-4">
            Set <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#A0A0A0] text-xs font-mono">NEXT_PUBLIC_NOCODB_URL</code> in your <code className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#A0A0A0] text-xs font-mono">.env.local</code> to enable.
          </p>

          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#6B7280] shrink-0" />
            <p className="text-xs text-[#6B7280]">Start NocoDB with Docker:</p>
          </div>
          <div className="mt-2 p-3 rounded-[6px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] font-mono text-xs text-[#A0A0A0] whitespace-pre-wrap break-all">
            {`docker run -d --name nocodb -p 8080:8080 nocodb/nocodb:latest`}
          </div>
          <button
            onClick={copyCmd}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy full command (with Neon connection)'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)] shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#6B7280]" />
          <span className="text-sm font-semibold text-[#F5F5F5]">Bases</span>
          <span className="text-xs text-[#4B5563] ml-1">via NocoDB</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[6px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] text-[#A0A0A0] hover:text-[#F5F5F5] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in NocoDB
        </a>
      </div>

      {/* NocoDB iframe */}
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title="NocoDB"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
