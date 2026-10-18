import { NavLink } from 'react-router-dom'
import { ArrowLeftIcon, HistoryIcon, NodesIcon } from '@/shared/components/ui/icons'

export function WorkspaceDock({ workspaceId }: { workspaceId: string }) {
  return (
    <nav className="ws-dock" aria-label="Workspace">
      <NavLink to="/workspaces" className="back">
        <ArrowLeftIcon />
        <span>Workspaces</span>
      </NavLink>
      <i className="sep" />
      <NavLink to={`/workspaces/${workspaceId}`} end>
        <NodesIcon />
        Editor
      </NavLink>
      <NavLink to={`/workspaces/${workspaceId}/runs`}>
        <HistoryIcon />
        Run history
      </NavLink>
    </nav>
  )
}
