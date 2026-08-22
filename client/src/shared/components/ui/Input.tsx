import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 text-sm border border-line rounded-lg bg-white text-ink placeholder:text-muted outline-none focus:border-brand transition-colors',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
