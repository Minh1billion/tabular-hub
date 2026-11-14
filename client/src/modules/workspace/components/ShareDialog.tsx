import { FormEvent, ReactNode, useState } from 'react'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Modal } from '@/shared/components/ui/Modal'
import { TrashIcon } from '@/shared/components/ui/icons'
import { useInviteMember, useRemoveMember, useRevokeInvitation, useWorkspaceMembers } from '../hooks'
import { formatRelative } from '../lib/activity'
import { InviteResult, Workspace, WorkspaceInvitation, WorkspaceMember } from '../types'

interface ShareDialogProps {
  workspace: Pick<Workspace, 'id' | 'name'>
  onClose: () => void
}

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function PersonRow({ member, action }: { member: WorkspaceMember; action?: ReactNode }) {
  const label = member.display_name || member.email
  return (
    <li className="sh-row">
      <Avatar name={label} imageUrl={member.avatar_url} size={30} />
      <div className="sh-who">
        <b>{label}</b>
        {member.display_name && <small>{member.email}</small>}
      </div>
      {member.role === 'owner' ? <Badge tone="team">Owner</Badge> : <Badge tone="personal">Member</Badge>}
      {action}
    </li>
  )
}

function InvitationRow({ invitation, action }: { invitation: WorkspaceInvitation; action: ReactNode }) {
  const expired = invitation.status === 'expired'
  return (
    <li className="sh-row">
      <Avatar name={invitation.email} size={30} />
      <div className="sh-who">
        <b>{invitation.email}</b>
        <small>{expired ? 'Invitation expired' : `Expires ${formatRelative(invitation.expires_at)}`}</small>
      </div>
      <Badge tone={expired ? 'error' : 'pending'}>{expired ? 'Expired' : 'Pending'}</Badge>
      {action}
    </li>
  )
}

export function ShareDialog({ workspace, onClose }: ShareDialogProps) {
  const { data, isLoading, isError, error, refetch } = useWorkspaceMembers(workspace.id)
  const invite = useInviteMember(workspace.id)
  const remove = useRemoveMember(workspace.id)
  const revoke = useRevokeInvitation(workspace.id)

  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; value: InviteResult } | null>(null)
  const [copied, setCopied] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const value = email.trim()
    if (!value || invite.isPending) return
    if (!EMAIL_PATTERN.test(value)) {
      setFormError('Enter a valid email address.')
      return
    }
    setFormError(null)
    setResult(null)
    setCopied(false)
    invite.mutate(value, {
      onSuccess: (response) => {
        setResult({ email: value, value: response })
        setEmail('')
      },
      onError: (e) => setFormError(messageOf(e)),
    })
  }

  function handleRemove(userId: string) {
    setActionError(null)
    remove.mutate(userId, { onError: (e) => setActionError(messageOf(e)) })
  }

  function handleRevoke(invitationId: string) {
    setActionError(null)
    revoke.mutate(invitationId, { onError: (e) => setActionError(messageOf(e)) })
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal title={`Share "${workspace.name}"`} onClose={onClose} className="sh-modal">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="share-email">
            Invite by email
          </label>
          <div className="sh-invite">
            <Input
              id="share-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              maxLength={254}
            />
            <Button type="submit" size="sm" loading={invite.isPending} disabled={!email.trim()}>
              Invite
            </Button>
          </div>
          <span className="hint">Members can edit pipelines, datasets and runs. Only you can rename, delete or share this workspace.</span>
        </div>
        {formError && <p className="err m-0 mb-3">{formError}</p>}
        {result && (
          <div className="sh-note">
            <p>
              {result.value.member
                ? `${result.email} now has access to this workspace.`
                : `Invitation created for ${result.email}. They get access when they sign in with this email.`}
            </p>
            {!result.value.email_sent && (
              <p className="sh-warn">
                The email could not be sent.{' '}
                <button type="button" className="sh-link" onClick={() => copyLink(result.value.invite_url)}>
                  {copied ? 'Link copied' : 'Copy the link'}
                </button>{' '}
                and send it yourself.
              </p>
            )}
          </div>
        )}
      </form>

      <div className="sh-section">
        <h3>People with access</h3>
        {isLoading && <div className="skeleton" style={{ height: 96 }} />}
        {isError && (
          <p className="err m-0">
            {messageOf(error)}{' '}
            <button type="button" className="sh-link" onClick={() => refetch()}>
              Try again
            </button>
          </p>
        )}
        {data && (
          <ul className="sh-list">
            <PersonRow member={data.owner} />
            {data.members.map((member) => (
              <PersonRow
                key={member.user_id}
                member={member}
                action={
                  <IconButton
                    size="sm"
                    flat
                    tone="danger"
                    tip="Remove access"
                    disabled={remove.isPending && remove.variables === member.user_id}
                    onClick={() => handleRemove(member.user_id)}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </IconButton>
                }
              />
            ))}
            {data.invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                action={
                  <IconButton
                    size="sm"
                    flat
                    tone="danger"
                    tip="Revoke invitation"
                    disabled={revoke.isPending && revoke.variables === invitation.id}
                    onClick={() => handleRevoke(invitation.id)}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </IconButton>
                }
              />
            ))}
          </ul>
        )}
        {actionError && <p className="err m-0 mt-2">{actionError}</p>}
      </div>

      <div className="modal-actions">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
