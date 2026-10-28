import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  highlighted?: boolean
  interactive?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, highlighted, interactive, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn('card', interactive && 'interactive', highlighted && 'highlighted', className)}
      {...props}
    />
  )
})
