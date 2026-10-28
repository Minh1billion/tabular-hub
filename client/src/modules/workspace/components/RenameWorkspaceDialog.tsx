import { FormEvent, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'

interface RenameWorkspaceDialogProps {
  currentName: string
  onConfirm: (newName: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function RenameWorkspaceDialog({ currentName, onConfirm, onCancel, isLoading = false }: RenameWorkspaceDialogProps) {
  const [name, setName] = useState(currentName)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) return
    onConfirm(trimmed)
  }

  return (
    <Modal title="Rename workspace" onClose={onCancel}>
      <form onSubmit={handleSubmit}>
        <Field label="Workspace name">
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Workspace name" maxLength={200} />
        </Field>
        <div className="modal-actions">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isLoading} disabled={!name.trim() || name.trim() === currentName}>
            Rename
          </Button>
        </div>
      </form>
    </Modal>
  )
}
