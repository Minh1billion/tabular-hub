import { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type BadgeTone = 'team' | 'personal' | 'success' | 'error' | 'pending'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ className, tone = 'team', ...props }: BadgeProps) {
  return <span className={cn('badge', `badge-${tone}`, className)} {...props} />
}
