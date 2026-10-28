import { Link, NavLink, useLocation } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { EdgeToggle } from '@/shared/components/ui/EdgeToggle'
import { BoltIcon, CardIcon, GridIcon, HomeIcon } from '@/shared/components/ui/icons'
import { useSubscription } from '@/modules/billing/hooks'

const items = [
  { to: '/', label: 'Home', Icon: HomeIcon, match: (p: string) => p === '/' },
  { to: '/workspaces', label: 'Workspaces', Icon: GridIcon, match: (p: string) => p.startsWith('/workspaces') },
  { to: '/billing', label: 'Billing', Icon: CardIcon, match: (p: string) => p.startsWith('/billing') },
]

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { pathname } = useLocation()
  const { data: subscription } = useSubscription()

  const activeIndex = items.findIndex((i) => i.match(pathname))

  return (
    <aside className="side">
      <EdgeToggle collapsed={collapsed} onClick={onToggle} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} />
      <div className="side-head">
        <Link to="/" className="brand" aria-label="Tabular Hub">
          <img src={logo} alt="" />
          <span className="side-label">
            Tabular<b>Hub</b>
          </span>
        </Link>
      </div>

      <nav className="side-nav" aria-label="Main">
        <span className="side-section">Menu</span>
        {items.map(({ to, label, Icon }, i) => (
          <div key={to} className="nav-item">
            <NavLink to={to} end={to === '/'} aria-label={label} className={i === activeIndex ? 'active' : undefined}>
              <span className="nav-ico">
                <Icon />
              </span>
              <span className="side-label">{label}</span>
            </NavLink>
            <span className="nav-tip" role="tooltip">
              {label}
            </span>
          </div>
        ))}
      </nav>

      <div className="side-foot">
        <div className="nav-item">
          <Link to="/billing" className="plan-chip" aria-label="Plan">
            <BoltIcon />
            <strong>{subscription?.tier ?? 'free'}</strong>
            <small>Plan</small>
          </Link>
          <span className="nav-tip" role="tooltip">
            {subscription?.tier ?? 'free'} plan
          </span>
        </div>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const { pathname } = useLocation()
  return (
    <nav className="mobile-nav" aria-label="Main">
      {items.map(({ to, label, Icon, match }) => (
        <Link key={to} to={to} className={match(pathname) ? 'active' : undefined}>
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  )
}
