import { Avatar } from '@/shared/components/ui/Avatar'
import { cn } from '@/shared/lib/cn'
import { userColor, userLabel } from '../lib/colors'
import { CollabStatus, CollabUser } from '../types'

const MAX_VISIBLE = 5

interface PresenceBarProps {
  users: CollabUser[]
  meId?: string
  status: CollabStatus
}

export function PresenceBar({ users, meId, status }: PresenceBarProps) {
  const ordered = [...users].sort((a, b) => Number(b.id === meId) - Number(a.id === meId) || a.id.localeCompare(b.id))
  const visible = ordered.slice(0, MAX_VISIBLE)
  const hidden = ordered.length - visible.length

  return (
    <div className={cn('presence', status !== 'open' && 'offline')} aria-label="People in this workspace">
      <span className="presence-dot" title={status === 'open' ? 'Live' : 'Reconnecting…'} />
      <ul className="presence-list">
        {visible.map((user) => (
          <li
            key={user.id}
            className="presence-item"
            style={{ ['--user' as string]: userColor(user.id) }}
            title={user.id === meId ? `${userLabel(user)} (you)` : userLabel(user)}
          >
            <Avatar name={userLabel(user)} imageUrl={user.avatar_url} size={24} />
          </li>
        ))}
        {hidden > 0 && <li className="presence-more">+{hidden}</li>}
      </ul>
    </div>
  )
}
