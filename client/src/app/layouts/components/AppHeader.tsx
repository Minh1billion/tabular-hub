import { Link, useLocation } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { BookIcon, GitHubIcon } from '@/shared/components/ui/icons'
import { UsageTracker } from '@/modules/billing/components/UsageTracker'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { UserMenu } from './UserMenu'

const ENGINE_REPO_URL = 'https://github.com/Minh1billion/tabular-manner'
const HUB_REPO_URL = 'https://github.com/Minh1billion/tabular-hub'
const DOCS_URL = 'https://minh1billion.github.io/tabular-manner/'

interface AppHeaderProps {
  slotRef: (el: HTMLElement | null) => void
}

export function AppHeader({ slotRef }: AppHeaderProps) {
  const { pathname } = useLocation()
  const inEditor = pathname.startsWith('/app')

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="Tabular Hub home">
        <img src={logo} alt="" />
        <span>
          Tabular<b>Hub</b>
        </span>
      </Link>

      <span className="crumb-sep">/</span>
      {inEditor ? <WorkspaceSwitcher /> : <h1 className="topbar-title">Plan &amp; billing</h1>}

      <div className="topbar-spacer" />

      <div ref={slotRef} className="topbar-slot" />

      <UsageTracker />

      <a className="top-link" href={DOCS_URL} target="_blank" rel="noreferrer">
        <BookIcon className="w-4 h-4" />
        Docs
      </a>
      <div className="top-icons">
        <a className="icon-btn sm tip-host" data-tip="Engine repo" data-side="bottom" href={ENGINE_REPO_URL} target="_blank" rel="noreferrer" aria-label="Engine on GitHub">
          <GitHubIcon className="w-4 h-4" />
        </a>
        <a className="icon-btn sm tip-host" data-tip="Hub repo" data-side="bottom" href={HUB_REPO_URL} target="_blank" rel="noreferrer" aria-label="Hub on GitHub">
          <GitHubIcon className="w-4 h-4" />
        </a>
      </div>

      <UserMenu />
    </header>
  )
}
