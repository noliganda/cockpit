'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CustomCheckboxProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  onClick?: (e: React.MouseEvent) => void
  className?: string
}

export function CustomCheckbox({
  checked,
  onChange,
  onClick,
  className,
}: CustomCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onClick) onClick(e)
    if (onChange) onChange(!checked)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center flex-shrink-0 rounded-[3px] transition-all',
        'w-3.5 h-3.5 cursor-pointer',
        checked
          ? 'bg-[#E5E5E5] border border-[#E5E5E5]'
          : 'bg-[#1A1A1A] border border-[rgba(255,255,255,0.22)] hover:border-[rgba(255,255,255,0.40)]',
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
