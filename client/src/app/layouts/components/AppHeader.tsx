import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { Avatar } from '@/shared/components/ui/Avatar'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks'
import { useWorkspaces } from '@/modules/workspace/hooks'
import { cn } from '@/shared/lib/cn'

export function AppHeader() {
  const { data: user } = useCurrentUser()
  const { data: workspaces = [] } = useWorkspaces()
  const logout = useLogout()
  const navigate = useNavigate()
  const { id: activeWorkspaceId } = useParams<{ id: string }>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const displayName = user?.display_name ?? user?.email ?? ''
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)

  function handleLogout() {
    setLogoutError(null)
    logout.mutate(undefined, {
      onSuccess: () => {
        setShowLogoutConfirm(false)
        navigate('/login', { replace: true })
      },
      onError: (err) => {
        setLogoutError(err instanceof Error ? err.message : 'Failed to log out')
      },
    })
  }

  return (
    <header className="h-14 flex items-center gap-2.5 px-5 bg-white border-b border-line">
      <img src={logo} alt="Tabular Manner" className="w-[26px] h-[26px]" />

      <div className="flex items-center gap-2.5 text-[13.5px]">
        <span className="text-slate font-medium">{displayName}</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-px bg-line" />
          <span className="w-[3px] h-[3px] rounded-full bg-muted" />
          <span className="w-2.5 h-px bg-line" />
        </span>

        <div className="relative">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen((open) => !open)}
            className="flex items-center gap-1 text-ink font-semibold"
          >
            {activeWorkspace?.name ?? 'Workspaces'}
            <svg className="w-3 h-3 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-0 top-8 w-56 bg-white border border-line rounded-lg py-1.5 z-20 max-h-72 overflow-auto">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => {
                    navigate(`/workspaces/${workspace.id}`)
                    setWorkspaceMenuOpen(false)
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-cream-soft transition-colors truncate',
                    workspace.id === activeWorkspaceId ? 'text-brand font-medium' : 'text-ink',
                  )}
                >
                  {workspace.name}
                </button>
              ))}
              <div className="border-t border-line my-1.5" />
              <button
                type="button"
                onClick={() => {
                  navigate('/workspaces')
                  setWorkspaceMenuOpen(false)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-muted hover:bg-cream-soft transition-colors"
              >
                All workspaces
              </button>
            </div>
          )}
        </div>

        <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-brand-tint text-[#0f6e4c] tracking-wide">
          Free
        </span>
      </div>

      <div className="flex-1" />

      <div className="relative">
        <button type="button" onClick={() => setMenuOpen((open) => !open)}>
          <Avatar name={displayName || 'U'} imageUrl={user?.avatar_url} size={28} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-9 w-44 bg-white border border-line rounded-lg py-1.5 z-20">
            <div className="px-3 py-1.5 text-xs text-muted truncate">{user?.email}</div>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setLogoutError(null)
                setShowLogoutConfirm(true)
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cream-soft transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Log out"
          description="Are you sure you want to log out of your account?"
          confirmLabel="Log out"
          loadingLabel="Logging out…"
          confirmVariant="primary"
          isLoading={logout.isPending}
          error={logoutError}
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </header>
  )
}
