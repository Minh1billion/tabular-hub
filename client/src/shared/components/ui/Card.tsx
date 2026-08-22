import { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-line rounded-card p-[18px] transition-colors hover:border-[#c7ccc4]',
        className,
      )}
      {...props}
    />
  )
}
