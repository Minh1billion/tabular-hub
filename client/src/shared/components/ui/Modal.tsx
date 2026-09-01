import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void
  title: string
  children: ReactNode
}

export function Modal({ onClose, title, children, className, ...props }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={cn('relative w-[460px] max-w-[90vw] bg-white border-2 border-black rounded-panel p-5', className)}
        {...props}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-headline font-semibold text-[15px]">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6 18 18M6 18 18 6" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}