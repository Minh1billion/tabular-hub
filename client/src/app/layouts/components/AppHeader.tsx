import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { Avatar } from '@/shared/components/ui/Avatar'
import { useCurrentUser, useLogout } from '@/modules/auth/hooks'

export function AppHeader() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user?.display_name ?? user?.email ?? ''

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
        <span className="text-ink font-semibold">Workspaces</span>
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