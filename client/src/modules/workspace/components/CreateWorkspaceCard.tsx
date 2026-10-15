import { FormEvent, useState } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'

interface CreateWorkspaceCardProps {
  isOpen: boolean
  onOpen: () => void
  onCancel: () => void
  onSubmit: (name: string) => void
  isSubmitting: boolean
}

export function CreateWorkspaceCard({ isOpen, onOpen, onCancel, onSubmit, isSubmitting }: CreateWorkspaceCardProps) {
  const [name, setName] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setName('')
  }

  if (isOpen) {
    return (
      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-black rounded-card p-[18px] flex flex-col gap-3 min-h-[180px] justify-center"
      >
        <label className="text-xs font-mono text-muted">WORKSPACE NAME</label>
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Growth Experiments"
          maxLength={200}
        />
        <div className="flex items-center gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-cream-soft border-2 border-dashed border-black rounded-card p-[18px] flex flex-col items-start justify-center gap-2.5 min-h-[180px] text-left transition-colors hover:border-brand"
    >
      <div className="w-[34px] h-[34px] rounded-[9px] bg-white border border-line flex items-center justify-center">
        <svg className="w-4 h-4 text-slate" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-1">Create a new workspace</h3>
        <p className="text-xs text-muted">Start with an empty workspace.</p>
      </div>
    </button>
  )
}