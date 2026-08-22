import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

const navItems = [
  {
    label: 'Home',
    to: '/home',
    icon: <path d="M4 11 12 4l8 7M6 9v10h12V9" />,
  },
  {
    label: 'Workspaces',
    to: '/workspaces',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 10h16M10 10v10" />
      </>
    ),
  },
  {
    label: 'Resources',
    to: '/resources',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="4" rx="1.2" />
        <rect x="4" y="15" width="16" height="4" rx="1.2" />
      </>
    ),
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: (
      <>
        <path d="M5 12a7 7 0 1 1 14 0 7 7 0 0 1-14 0Z" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
      </>
    ),
  },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <nav className="w-14 bg-white border-r border-line flex flex-col items-center py-4 gap-1.5">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
              isActive ? 'bg-brand-deep text-[#ddeee3]' : 'text-muted hover:bg-cream-soft hover:text-slate',
            )}
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {item.icon}
            </svg>
          </Link>
        )
      })}
    </nav>
  )
}
