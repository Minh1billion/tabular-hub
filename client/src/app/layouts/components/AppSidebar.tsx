import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

export function AppSidebar() {
  const location = useLocation()
  const isActive = location.pathname.startsWith('/workspaces')

  return (
    <nav className="w-14 bg-white border-r border-line flex flex-col items-center py-4 gap-1.5">
      <Link
        to="/workspaces"
        title="Workspaces"
        className={cn(
          'w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
          isActive ? 'bg-brand-deep text-[#ddeee3]' : 'text-muted hover:bg-cream-soft hover:text-slate',
        )}
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16M10 10v10" />
        </svg>
      </Link>
    </nav>
  )
}
