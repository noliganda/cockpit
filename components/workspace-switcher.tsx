'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { useWorkspace } from '@/hooks/use-workspace'
import { WORKSPACES, type WorkspaceId } from '@/types'
import { cn } from '@/lib/utils'

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false)
  const { workspace, setWorkspace } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()

  function handleSwitch(id: WorkspaceId) {
    setWorkspace(id)
    setOpen(false)
    // Navigate to current page with new workspace param to trigger server re-fetch
    router.push(`${pathname}?workspace=${id}`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-[6px] hover:bg-[#141414] transition-colors text-left"
      >
        <span className="text-base leading-none">{workspace.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F5F5F5] truncate">{workspace.name}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#6B7280] transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-[#222222] border border-[rgba(255,255,255,0.10)] rounded-[8px] z-20 shadow-lg">
            {WORKSPACES.map(ws => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id as WorkspaceId)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[rgba(255,255,255,0.04)] text-left transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color }}
                />
                <span className="text-sm text-[#F5F5F5] flex-1">{ws.name}</span>
                {ws.id === workspace.id && <Check className="w-3.5 h-3.5 text-[#6B7280]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
