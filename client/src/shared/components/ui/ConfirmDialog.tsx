import { useEffect, useRef } from 'react'
import { Button } from './Button'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  loadingLabel?: string
  confirmVariant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  error?: string | null
}

/**
 * Reusable confirm dialog.
 * - Closes on Esc key
 * - Auto-focuses the safe "Cancel" button
 * - Clicking backdrop also cancels
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  loadingLabel,
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
  error,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Auto-focus Cancel (safe action) when dialog mounts
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Close on Esc
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      {/* Panel — z-10 ensures it stacks above backdrop, stopPropagation prevents closing on panel click */}
      <div
        className="relative z-10 w-[420px] max-w-[90vw] bg-white border border-line rounded-panel p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-headline font-semibold text-[15px] mb-2">
          {title}
        </h2>
        <p className="text-[13.5px] text-slate leading-relaxed mb-6">{description}</p>

        {error && (
          <p className="text-xs text-warn mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Error: {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            variant={confirmVariant === 'primary' ? 'primary' : 'outline'}
            className={confirmVariant === 'danger' ? 'bg-warn text-white border-transparent hover:bg-warn/90' : undefined}
          >
            {isLoading ? (loadingLabel ?? (confirmLabel ? `${confirmLabel}…` : 'Deleting…')) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
