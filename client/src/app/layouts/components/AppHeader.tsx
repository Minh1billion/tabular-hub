import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Avatar } from '@/shared/components/ui/Avatar'
import { cn } from '@/shared/lib/cn'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { ArrowLeftIcon, BookIcon, ChevronIcon, GitHubIcon, HistoryIcon, LogoutIcon, NodesIcon } from '@/shared/components/ui/icons'
import { useClickOutside } from '@/shared/hooks/useClickOutside'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks'
import { useWorkspaces } from '@/modules/workspace/hooks'

const ENGINE_REPO_URL = 'https://github.com/Minh1billion/tabular-manner'
const HUB_REPO_URL = 'https://github.com/Minh1billion/tabular-hub'
const DOCS_URL = 'https://minh1billion.github.io/tabular-manner/'

const titles: [string, string][] = [
  ['/billing', 'Billing'],
  ['/workspaces', 'Workspaces'],
  ['/', 'Home'],
]

export function AppHeader() {
  const { data: workspaces = [] } = useWorkspaces()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>()
  const activeId = id ?? workspaceId
  const active = workspaces.find((w) => w.id === activeId)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false), open)

  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const [userOpen, setUserOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const userRef = useRef<HTMLDivElement>(null)
  useClickOutside(userRef, () => setUserOpen(false), userOpen)
  const displayName = user?.display_name ?? user?.email ?? 'U'

  function handleLogout() {
    setError(null)
    logout.mutate(undefined, {
      onSuccess: () => {
        setConfirm(false)
        navigate('/login', { replace: true })
      },
      onError: (e) => setError(e instanceof Error ? e.message : 'Failed to log out'),
    })
  }

  const section = titles.find(([p]) => (p === '/' ? pathname === '/' : pathname.startsWith(p)))?.[1] ?? ''
  const inWorkspace = pathname.startsWith('/workspaces/')
  const inRuns = pathname.includes('/runs')

  return (
    <header className="topbar">
      {inWorkspace ? (
        <>
          <Link to="/workspaces" className="btn btn-outline btn-sm">
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Workspaces
          </Link>
          <span className="crumb-sep">/</span>
          <div ref={ref} className="ws-menu">
            <button type="button" className="ws-trigger" aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((o) => !o)}>
              <Avatar name={active?.name ?? 'W'} size={22} />
              <span className="name">{active?.name ?? 'Select'}</span>
              <ChevronIcon />
            </button>
            {open && (
              <div className="ws-list" role="listbox">
                {workspaces.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={w.id === activeId}
                    onClick={() => {
                      navigate(`/workspaces/${w.id}`)
                      setOpen(false)
                    }}
                  >
                    <span className="truncate">{w.name}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="all"
                  onClick={() => {
                    navigate('/workspaces')
                    setOpen(false)
                  }}
                >
                  All workspaces
                </button>
              </div>
            )}
          </div>
          <Link to={`/workspaces/${activeId}`} className={cn('btn btn-sm', inRuns ? 'btn-outline' : 'btn-primary')} aria-current={inRuns ? undefined : 'page'}>
            <NodesIcon className="w-3.5 h-3.5" />
            Editor
          </Link>
          <Link to={`/workspaces/${activeId}/runs`} className={cn('btn btn-sm', inRuns ? 'btn-primary' : 'btn-outline')} aria-current={inRuns ? 'page' : undefined}>
            <HistoryIcon className="w-3.5 h-3.5" />
            Runs
          </Link>
        </>
      ) : (
        <h1 className="m-0 text-[16px] font-bold tracking-tight">{section}</h1>
      )}

      <div className="topbar-spacer" />

      <a className="top-link" href={DOCS_URL} target="_blank" rel="noreferrer">
        <BookIcon className="w-4 h-4" />
        Docs
      </a>
      <a className="icon-btn sm tip-host" data-tip="Engine repo" data-side="bottom" href={ENGINE_REPO_URL} target="_blank" rel="noreferrer" aria-label="Engine on GitHub">
        <GitHubIcon className="w-4 h-4" />
      </a>
      <a className="icon-btn sm tip-host" data-tip="Hub repo" data-side="bottom" href={HUB_REPO_URL} target="_blank" rel="noreferrer" aria-label="Hub on GitHub">
        <GitHubIcon className="w-4 h-4" />
      </a>

      <div ref={userRef} className="user-menu">
        <button type="button" className="user-trigger" aria-label="Account" aria-expanded={userOpen} aria-haspopup="menu" onClick={() => setUserOpen((o) => !o)}>
          <Avatar name={displayName} imageUrl={user?.avatar_url} size={32} />
        </button>
        {userOpen && (
          <div className="user-list" role="menu">
            <div className="user-info">
              <strong>{user?.display_name ?? 'Account'}</strong>
              <small>{user?.email}</small>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserOpen(false)
                setError(null)
                setConfirm(true)
              }}
            >
              <LogoutIcon className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>

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
    </header>
  )
}
