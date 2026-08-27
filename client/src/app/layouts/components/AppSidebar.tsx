import { Link, useLocation, useParams } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

const workspacesItem = {
  label: 'Workspaces',
  to: '/workspaces',
  icon: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M10 10v10" />
    </>
  ),
}

const resourcesIcon = (
  <>
    <rect x="4" y="5" width="16" height="4" rx="1.2" />
    <rect x="4" y="15" width="16" height="4" rx="1.2" />
  </>
)

export function AppSidebar() {
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  const resourcesTo = id ? `/workspaces/${id}/resources` : null
  const isResourcesActive = Boolean(resourcesTo) && location.pathname === resourcesTo
  const isWorkspacesActive = location.pathname.startsWith('/workspaces') && !isResourcesActive

  return (
    <nav className="w-14 bg-white border-r border-line flex flex-col items-center py-4 gap-1.5">
      <Link
        to={workspacesItem.to}
        title={workspacesItem.label}
        className={cn(
          'w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
          isWorkspacesActive ? 'bg-brand-deep text-[#ddeee3]' : 'text-muted hover:bg-cream-soft hover:text-slate',
        )}
      >
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          {workspacesItem.icon}
        </svg>
      </Link>

      {resourcesTo ? (
        <Link
          to={resourcesTo}
          title="Resources"
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-[9px] transition-colors',
            isResourcesActive ? 'bg-brand-deep text-[#ddeee3]' : 'text-muted hover:bg-cream-soft hover:text-slate',
          )}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {resourcesIcon}
          </svg>
        </Link>
      ) : (
        <span title="Open a workspace to see its resources" className="w-9 h-9 flex items-center justify-center rounded-[9px] text-line cursor-not-allowed">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {resourcesIcon}
          </svg>
        </span>
      )}
    </nav>
  )
}
