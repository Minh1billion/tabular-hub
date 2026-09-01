import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

const iconButtonClasses =
  'w-9 h-9 flex items-center justify-center rounded-[9px] border-2 border-black transition-colors'

function SidebarIcon({
  to,
  title,
  active,
  children,
}: {
  to: string
  title: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      title={title}
      aria-label={title}
      className={cn(
        iconButtonClasses,
        active ? 'bg-[#32664d] text-[#f5f5ef]' : 'bg-cream text-slate hover:bg-cream-soft',
      )}
    >
      {children}
    </Link>
  )
}

export function AppSidebar() {
  const location = useLocation()
  const isWorkspacesActive = location.pathname.startsWith('/workspaces')
  const isHomeActive = location.pathname === '/'

  return (
    <nav className="w-14 bg-white border-r border-line flex flex-col items-center py-4 gap-1.5">
      <SidebarIcon to="/" title="Home" active={isHomeActive}>
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
        </svg>
      </SidebarIcon>

      <div className="w-6 h-px bg-line my-0.5" />

      <SidebarIcon to="/workspaces" title="Workspaces" active={isWorkspacesActive}>
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M10 10v10" />
        </svg>
      </SidebarIcon>
    </nav>
  )
}