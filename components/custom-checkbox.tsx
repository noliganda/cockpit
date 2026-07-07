'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomCheckboxProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  onClick?: (e: React.MouseEvent) => void
  className?: string
  /** Workspace accent color — e.g. '#C99A1F' for BF, '#3E7A70' for KORUS, '#C96F2E' for personal */
  accentColor?: string
}

export function CustomCheckbox({
  checked,
  onChange,
  onClick,
  className,
  accentColor,
}: CustomCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick) onClick(e)
    if (onChange) onChange(!checked)
  }

  // Workspace-colored style (inline, since Tailwind can't purge dynamic colors)
  if (accentColor) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center flex-shrink-0 rounded-none transition-all w-3.5 h-3.5 cursor-pointer border',
          className
        )}
        style={
          checked
            ? { background: accentColor, borderColor: accentColor }
            : { background: 'transparent', borderColor: accentColor, opacity: 0.7 }
        }
        aria-label={checked ? 'Checked' : 'Unchecked'}
      >
        {checked && <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: '#0F0C09' }} />}
      </button>
    )
  }

  // Default (no workspace color) — high-contrast neutral
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0 rounded-none transition-all',
        'w-3.5 h-3.5 cursor-pointer border',
        checked
          ? 'bg-[#E8DFCE] border-[#E8DFCE]'
          : 'bg-transparent border-[rgba(167,155,120,0.77)] hover:border-[rgba(167,155,120,0.9)]',
        className
      )}
      aria-label={checked ? 'Checked' : 'Unchecked'}
    >
      {checked && (
        <Check className="w-2.5 h-2.5 text-[#0F0C09] stroke-[3]" />
      )}
    </button>
  )
}
