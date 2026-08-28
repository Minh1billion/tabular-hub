import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { highlighted?: boolean }>(
  function Card({ className, highlighted, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white border border-line rounded-card p-[18px] transition-all duration-300 hover:border-[#c7ccc4]',
          highlighted && 'border-[#32664d] ring-2 ring-[#32664d]/30 shadow-[0_0_0_4px_rgba(50,102,77,0.08)]',
          className,
        )}
        {...props}
      />
    )
  },
)