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
        className="w-full flex items-center gap-2 px-2 py-2 rounded-none hover:bg-[#1A1510] transition-colors text-left"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: workspace.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#E8DFCE] truncate">{workspace.name}</p>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#7A6F55] transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-[#272018] border border-[rgba(167,155,120,0.22)] rounded-none z-20">
            {WORKSPACES.map(ws => (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id as WorkspaceId)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[rgba(167,155,120,0.09)] text-left transition-colors"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ws.color }}
                />
                <span className="text-sm text-[#E8DFCE] flex-1">{ws.name}</span>
                {ws.id === workspace.id && <Check className="w-3.5 h-3.5 text-[#7A6F55]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
