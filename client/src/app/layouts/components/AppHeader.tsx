import { PropsWithChildren, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks'
import { useWorkspaces } from '@/modules/workspace/hooks'
import { useSubscription } from '@/modules/billing/hooks'
import { cn } from '@/shared/lib/cn'

const ENGINE_REPO_URL = 'https://github.com/Minh1billion/tabular-manner'
const HUB_REPO_URL = 'https://github.com/Minh1billion/tabular-hub'
const DOCS_URL = 'https://minh1billion.github.io/tabular-manner/'

function GitHubMark(props: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

/** A small square icon button with the app's signature black-bordered node treatment. */
function IconLink({
  href,
  label,
  children,
}: PropsWithChildren<{ href: string; label: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[9px] border-2 border-black bg-cream text-ink transition-colors hover:bg-ink hover:text-white"
    >
      {children}
    </a>
  )
}

export function AppHeader() {
  const { data: user } = useCurrentUser()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: subscription } = useSubscription()
  const logout = useLogout()
  const navigate = useNavigate()
  const { id, workspaceId } = useParams<{ id?: string; workspaceId?: string }>()
  const activeWorkspaceId = id ?? workspaceId

  const [menuOpen, setMenuOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const workspaceMenuRef = useRef<HTMLDivElement>(null)

  const displayName = user?.display_name ?? user?.email?.split('@')[0] ?? 'User'
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)
  const currentTier = subscription?.tier ?? 'free'

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setWorkspaceMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleConfirmLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLogoutConfirmOpen(false)
        navigate('/login', { replace: true })
      },
    })
  }

  return (
    <>
      <header className="h-14 flex items-center gap-2.5 px-5 bg-white border-b border-line">
        <Link to="/" className="shrink-0 flex items-center">
          <img src={logo} alt="Tabular Manner" className="w-[26px] h-[26px]" />
        </Link>

        <div className="flex items-center gap-2.5 text-[13.5px]">
          <span className="text-slate font-medium truncate max-w-[160px]">{displayName}</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-px bg-line" />
            <span className="w-[3px] h-[3px] rounded-full bg-muted" />
            <span className="w-2.5 h-px bg-line" />
          </span>

          <div className="relative" ref={workspaceMenuRef}>
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((open) => !open)}
              className="flex items-center gap-1 text-ink font-semibold hover:text-brand transition-colors"
            >
              {activeWorkspace?.name ?? 'Workspaces'}
              <svg
                className={cn('w-3 h-3 text-muted transition-transform duration-200', workspaceMenuOpen && 'rotate-180')}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {workspaceMenuOpen && (
              <div className="absolute left-0 top-8 w-56 bg-white border-2 border-black rounded-xl py-1.5 z-20 max-h-72 overflow-auto shadow-[0_6px_20px_rgba(22,35,28,0.12)]">
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
                      workspace.id === activeWorkspaceId ? 'text-brand font-medium bg-brand-tint/40' : 'text-ink',
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
                  className="w-full text-left px-3 py-1.5 text-sm text-muted hover:text-ink hover:bg-cream-soft transition-colors"
                >
                  All workspaces
                </button>
              </div>
            )}
          </div>

          <Link
            to="/billing"
            className="font-mono text-[10.5px] px-2 py-0.5 rounded-full bg-brand-tint text-[#0f6e4c] tracking-wide capitalize hover:bg-[#c9e8d6] transition-colors"
          >
            {currentTier}
          </Link>
        </div>

        <div className="flex-1" />

        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline text-[13.5px] text-slate hover:text-ink transition-colors mr-1"
        >
          Documentation
        </a>

        <IconLink href={ENGINE_REPO_URL} label="Tabular Manner engine on GitHub">
          <GitHubMark className="w-[17px] h-[17px]" />
        </IconLink>
        <IconLink href={HUB_REPO_URL} label="Tabular Hub on GitHub">
          <GitHubMark className="w-[17px] h-[17px]" />
        </IconLink>

        {/* User Avatar & Dropdown Menu */}
        <div className="relative ml-1" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Account menu"
            className={cn(
              'group flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border transition-all duration-200',
              menuOpen
                ? 'border-black bg-cream-soft shadow-[0_0_0_2px_rgba(23,166,114,0.2)]'
                : 'border-line bg-cream/60 hover:bg-cream-soft hover:border-[#b8beb5]',
            )}
          >
            <div className="relative">
              <Avatar name={displayName || 'U'} imageUrl={user?.avatar_url} size={28} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand border-2 border-white" />
            </div>
            <span className="hidden md:inline text-xs font-medium text-ink max-w-[110px] truncate">
              {displayName}
            </span>
            <svg
              className={cn(
                'w-3.5 h-3.5 text-muted group-hover:text-ink transition-transform duration-200',
                menuOpen && 'rotate-180 text-ink',
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-11 w-64 bg-white border-2 border-black rounded-xl py-2 z-30 shadow-[0_8px_24px_rgba(22,35,28,0.14)] animate-node-settle"
            >
              {/* User Info Card Header */}
              <div className="px-3.5 py-2.5 flex items-center gap-3 border-b border-line">
                <Avatar name={displayName || 'U'} imageUrl={user?.avatar_url} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
                    <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded-full bg-brand-tint text-[#0f6e4c] capitalize shrink-0">
                      {currentTier}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5" title={user?.email}>
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/workspaces')
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate hover:text-ink hover:bg-cream-soft transition-colors"
                >
                  <svg className="w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <path d="M4 10h16M10 10v10" />
                  </svg>
                  My Workspaces
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/billing')
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate hover:text-ink hover:bg-cream-soft transition-colors"
                >
                  <svg className="w-4 h-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                  Billing & Subscription
                </button>
              </div>

              <div className="border-t border-line my-1" />

              {/* Logout Action */}
              <div className="px-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setLogoutConfirmOpen(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-warn hover:bg-warn-tint/80 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Log out…
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {logoutConfirmOpen && (
        <Modal
          title="Confirm Log Out"
          onClose={() => !logout.isPending && setLogoutConfirmOpen(false)}
          className="w-[400px]"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-warn-tint text-warn flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div className="text-sm text-slate leading-relaxed">
                Are you sure you want to log out of <span className="font-semibold text-ink">{user?.email ?? displayName}</span>? You will need to sign in again to access your workspaces and pipelines.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logout.isPending}
                onClick={() => setLogoutConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={logout.isPending}
                onClick={handleConfirmLogout}
                className="bg-warn text-white hover:bg-[#a64509]"
              >
                {logout.isPending ? 'Logging out…' : 'Log out'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
