import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md'
  tone?: 'default' | 'danger'
  flat?: boolean
  active?: boolean
  tip?: string
  tipSide?: 'top' | 'right' | 'left'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', tone = 'default', flat, active, tip, tipSide = 'top', ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={tip}
      data-tip={tip}
      data-side={tipSide}
      className={cn(
        'icon-btn',
        tip && 'tip-host',
        size === 'sm' && 'sm',
        tone === 'danger' && 'danger',
        flat && 'flat',
        active && 'on',
        className,
      )}
      {...props}
    />
  ),
)

IconButton.displayName = 'IconButton'
