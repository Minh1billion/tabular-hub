import { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type BadgeTone = 'team' | 'personal'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const toneClasses: Record<BadgeTone, string> = {
  team: 'bg-brand-tint text-[#0f6e4c]',
  personal: 'bg-cream-soft text-slate',
}

export function Badge({ className, tone = 'team', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] tracking-wide px-2 py-1 rounded-full',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
