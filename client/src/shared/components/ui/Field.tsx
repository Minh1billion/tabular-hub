import { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface FieldProps {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}

export function Field({ label, hint, className, children }: FieldProps) {
  return (
    <div className={cn('field', className)}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}
