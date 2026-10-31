import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/shared/components/ui/Input'
import { Button } from '@/shared/components/ui/Button'
import { AlertIcon, PlusIcon, StarIcon } from '@/shared/components/ui/icons'

export interface PlanLimitInfo {
  /** Max workspaces allowed on the current plan, when known. */
  max?: number
  /** Current plan label, e.g. "Free". */
  planLabel?: string
  /** Server message, if the limit was reported by a failed create request. */
  message?: string
}

interface CreateWorkspaceCardProps {
  isOpen: boolean
  onOpen: () => void
  onCancel: () => void
  onSubmit: (name: string) => void
  isSubmitting: boolean
  error?: string | null
  /** When set, creating is blocked by the plan: show an upgrade prompt instead of the form. */
  planLimit?: PlanLimitInfo | null
}

export function CreateWorkspaceCard({ isOpen, onOpen, onCancel, onSubmit, isSubmitting, error, planLimit }: CreateWorkspaceCardProps) {
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

  if (isOpen && planLimit) {
    return <PlanLimitNotice limit={planLimit} onDismiss={onCancel} />
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

function PlanLimitNotice({ limit, onDismiss }: { limit: PlanLimitInfo; onDismiss: () => void }) {
  const planText = limit.planLabel ? `${limit.planLabel} plan` : 'current plan'
  const headline =
    limit.max != null
      ? `You've used all ${limit.max} workspace${limit.max === 1 ? '' : 's'} on your ${planText}.`
      : `You've reached the workspace limit on your ${planText}.`

  return (
    <div className="wsc-form wsc-limit" role="alert">
      <span className="wsc-limit-ico">
        <AlertIcon />
      </span>
      <div>
        <h3>Workspace limit reached</h3>
        <p>{headline} Upgrade to create more, or delete a workspace you no longer need.</p>
        {limit.message && <p className="detail">{limit.message}</p>}
      </div>
      <div className="actions">
        <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
          Not now
        </Button>
        <Link to="/billing" className="btn btn-primary btn-sm">
          <StarIcon className="w-3.5 h-3.5" />
          Upgrade
        </Link>
      </div>
    </div>
  )
}
