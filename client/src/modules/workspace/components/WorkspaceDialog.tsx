import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '@/shared/lib/api-client'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { useCreateWorkspace, useRenameWorkspace } from '../hooks'
import { Workspace } from '../types'

type WorkspaceDialogProps =
  | { mode: 'create'; workspace?: undefined; onClose: () => void; onDone?: (workspaceId: string) => void }
  | { mode: 'rename'; workspace: Pick<Workspace, 'id' | 'name'>; onClose: () => void; onDone?: (workspaceId: string) => void }

export function WorkspaceDialog({ mode, workspace, onClose, onDone }: WorkspaceDialogProps) {
  const create = useCreateWorkspace()
  const rename = useRenameWorkspace()
  const [name, setName] = useState(workspace?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [limited, setLimited] = useState(false)
  const pending = create.isPending || rename.isPending

  function handleError(e: unknown) {
    setLimited(e instanceof ApiError && e.status === 402)
    setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || pending) return
    setError(null)
    setLimited(false)

    if (mode === 'create') {
      create.mutate(
        { name: trimmed },
        {
          onSuccess: (created) => {
            onDone?.(created.id)
            onClose()
          },
          onError: handleError,
        },
      )
    } else if (workspace) {
      rename.mutate(
        { id: workspace.id, name: trimmed },
        {
          onSuccess: () => {
            onDone?.(workspace.id)
            onClose()
          },
          onError: handleError,
        },
      )
    }
  }

  return (
    <Modal title={mode === 'create' ? 'New workspace' : 'Rename workspace'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="workspace-name">
            Workspace name
          </label>
          <Input id="workspace-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Growth Experiments" maxLength={200} />
        </div>
        {error && (
          <p className="err m-0 mb-3">
            {error}
            {limited && (
              <>
                {' '}
                <Link to="/billing" className="underline" onClick={onClose}>
                  View plans
                </Link>
              </>
            )}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={pending} disabled={!name.trim()}>
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
