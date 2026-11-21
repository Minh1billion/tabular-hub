import { HTMLAttributes, ReactNode, useEffect } from 'react'
import { cn } from '@/shared/lib/cn'
import { IconButton } from './IconButton'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ onClose, title, children, className, ...props }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('modal', className)} {...props}>
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton size="sm" onClick={onClose} tip="Close">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6 18 18M6 18 18 6" />
            </svg>
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}
