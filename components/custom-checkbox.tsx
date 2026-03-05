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
        'w-3.5 h-3.5 cursor-pointer border border-[#2A2A2A]',
        checked
          ? 'bg-[#1F1F1F] border-[#3A3A3A]'
          : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]',
        className
      )}
      aria-label={checked ? 'Checked' : 'Unchecked'}
    >
      {checked && (
        <Check className="w-2.5 h-2.5 text-[#FFFFFF] stroke-[3]" />
      )}
    </button>
  )
}
