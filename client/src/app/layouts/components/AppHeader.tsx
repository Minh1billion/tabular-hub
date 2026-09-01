import { PropsWithChildren, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { Avatar } from '@/shared/components/ui/Avatar'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks'
import { useWorkspaces } from '@/modules/workspace/hooks'
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
  const logout = useLogout()
  const navigate = useNavigate()
  const { id: activeWorkspaceId } = useParams<{ id: string }>()
  const [menuOpen, setMenuOpen] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)

  const displayName = user?.display_name ?? user?.email ?? ''
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId)

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
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

      <div className="relative ml-1">
        <button type="button" onClick={() => setMenuOpen((open) => !open)}>
          <Avatar name={displayName || 'U'} imageUrl={user?.avatar_url} size={28} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-9 w-44 bg-white border border-line rounded-lg py-1.5 z-20">
            <div className="px-3 py-1.5 text-xs text-muted truncate">{user?.email}</div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="w-full text-left px-3 py-1.5 text-sm text-ink hover:bg-cream-soft transition-colors disabled:opacity-50"
            >
              {logout.isPending ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}