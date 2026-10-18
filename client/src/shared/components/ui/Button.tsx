import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'primary' | 'deep' | 'ghost' | 'outline' | 'danger' | 'solid-danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn('btn', `btn-${variant}`, `btn-${size}`, loading && 'is-loading', className)}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
