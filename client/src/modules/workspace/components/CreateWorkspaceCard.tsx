import { FormEvent, useEffect, useState } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { PlusIcon } from '@/shared/components/ui/icons'

interface CreateWorkspaceCardProps {
  isOpen: boolean
  onOpen: () => void
  onCancel: () => void
  onSubmit: (name: string) => void
  isSubmitting: boolean
  error?: string | null
}

export function CreateWorkspaceCard({ isOpen, onOpen, onCancel, onSubmit, isSubmitting, error }: CreateWorkspaceCardProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!isOpen) setName('')
  }, [isOpen])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  if (isOpen) {
    return (
      <form onSubmit={handleSubmit} className="wsc-form">
        <span className="kicker">Workspace name</span>
        <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Growth Experiments" maxLength={200} />
        {error && <p className="err m-0">{error}</p>}
        <div className="actions">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={isSubmitting} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </form>
    )
  }

  return (
    <button type="button" onClick={onOpen} className="wsc-new">
      <span className="plus">
        <PlusIcon className="w-4 h-4" />
      </span>
      <div>
        <h3>Create a new workspace</h3>
        <p>Start with an empty canvas.</p>
      </div>
    </button>
  )
}
