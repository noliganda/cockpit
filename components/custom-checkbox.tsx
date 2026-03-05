'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomCheckboxProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  onClick?: (e: React.MouseEvent) => void
  className?: string
  /** Workspace accent color — e.g. '#D4A017' for BF, '#008080' for KORUS, '#F97316' for personal */
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
          'inline-flex items-center justify-center flex-shrink-0 rounded-[3px] transition-all w-3.5 h-3.5 cursor-pointer border',
          className
        )}
        style={
          checked
            ? { background: accentColor, borderColor: accentColor }
            : { background: 'transparent', borderColor: accentColor, opacity: 0.7 }
        }
        aria-label={checked ? 'Checked' : 'Unchecked'}
      >
        {checked && <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: '#0A0A0A' }} />}
      </button>
    )
  }

  // Default (no workspace color) — high-contrast neutral
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0 rounded-[3px] transition-all',
        'w-3.5 h-3.5 cursor-pointer border',
        checked
          ? 'bg-[#E5E5E5] border-[#E5E5E5]'
          : 'bg-transparent border-[rgba(255,255,255,0.35)] hover:border-[rgba(255,255,255,0.60)]',
        className
      )}
      aria-label={checked ? 'Checked' : 'Unchecked'}
    >
      {checked && (
        <Check className="w-2.5 h-2.5 text-[#0A0A0A] stroke-[3]" />
      )}
    </button>
  )
}
