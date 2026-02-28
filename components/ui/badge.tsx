import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-[#2A2A2A] text-[#A0A0A0]',
        success: 'bg-green-900/30 text-green-400',
        warning: 'bg-yellow-900/30 text-yellow-400',
        danger: 'bg-red-900/30 text-red-400',
        info: 'bg-blue-900/30 text-blue-400',
        bf: 'bg-yellow-900/30 text-[#D4A017]',
        korus: 'bg-teal-900/30 text-[#008080]',
        personal: 'bg-orange-900/30 text-[#F97316]',
        notion: 'bg-[#2A2A2A] text-[#A0A0A0] border border-[#3A3A3A]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
