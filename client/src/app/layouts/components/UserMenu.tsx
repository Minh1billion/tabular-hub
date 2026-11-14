import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '@/shared/components/ui/Avatar'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { CardIcon, LogoutIcon } from '@/shared/components/ui/icons'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks'

export function UserMenu() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)
  const displayName = user?.display_name ?? user?.email ?? 'U'

  function handleLogout() {
    setError(null)
    logout.mutate(undefined, {
      onSuccess: () => {
        setConfirm(false)
        navigate('/', { replace: true })
      },
      onError: (e) => setError(e instanceof Error ? e.message : 'Failed to log out'),
    })
  }

  return (
    <div ref={ref} className="user-menu">
      <button type="button" className="user-trigger" aria-label="Account" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}>
        <Avatar name={displayName} imageUrl={user?.avatar_url} size={32} />
      </button>
      {open && (
        <div className="user-list" role="menu">
          <div className="user-info">
            <strong>{user?.display_name ?? 'Account'}</strong>
            <small>{user?.email}</small>
          </div>
          <Link to="/billing" role="menuitem" onClick={() => setOpen(false)}>
            <CardIcon className="w-4 h-4" />
            Plan &amp; billing
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setError(null)
              setConfirm(true)
            }}
          >
            <LogoutIcon className="w-4 h-4" />
            Log out
          </button>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title="Log out"
          description="Are you sure you want to log out of your account?"
          confirmLabel="Log out"
          confirmVariant="primary"
          isLoading={logout.isPending}
          error={error}
          onConfirm={handleLogout}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  )
}
