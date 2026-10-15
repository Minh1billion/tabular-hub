import { FormEvent, useState } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'

interface RenameWorkspaceDialogProps {
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function RenameWorkspaceDialog({
  currentName,
  onConfirm,
  onCancel,
  isLoading = false,
}: RenameWorkspaceDialogProps) {
  const [name, setName] = useState(currentName)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) return
    onConfirm(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative w-[420px] max-w-[90vw] bg-white border border-line rounded-panel p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-headline font-semibold text-[15px] mb-4">Rename workspace</h2>
        <label className="text-xs font-mono text-muted block mb-1.5">WORKSPACE NAME</label>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name"
          maxLength={200}
          className="mb-5"
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !name.trim() || name.trim() === currentName}
          >
            {isLoading ? 'Saving…' : 'Rename'}
          </Button>
        </div>
      </form>
    </div>
  )
}
