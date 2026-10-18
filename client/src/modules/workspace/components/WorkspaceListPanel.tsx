import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { PlusIcon, SearchIcon } from '@/shared/components/ui/icons'
import { Workspace } from '../types'
import { workspaceColorFor } from '../lib/color'

interface WorkspaceListPanelProps {
  workspaces: Workspace[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreateClick: () => void
  query: string
  onQueryChange: (value: string) => void
}

export function WorkspaceListPanel({ workspaces, activeId, onSelect, onCreateClick, query, onQueryChange }: WorkspaceListPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <aside className={cn('wl-side', !isOpen && 'closed')}>
      <div className="wl-side-head">
        {isOpen && (
          <span className="label">
            Workspaces <em>{workspaces.length}</em>
          </span>
        )}
        <IconButton size="sm" flat tip={isOpen ? 'Collapse' : 'Expand'} tipSide={isOpen ? 'top' : 'right'} onClick={() => setIsOpen((current) => !current)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </IconButton>
      </div>

      {isOpen ? (
        <div className="wl-side-body">
          <Button type="button" onClick={onCreateClick}>
            <PlusIcon className="w-3.5 h-3.5" />
            New workspace
          </Button>

          <div className="wl-search">
            <SearchIcon />
            <input className="input" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search workspaces…" />
          </div>

          <div className="wl-list thin-scrollbar">
            {workspaces.map((workspace) => (
              <button key={workspace.id} type="button" className={cn('wl-item', workspace.id === activeId && 'on')} onClick={() => onSelect(workspace.id)}>
                <span className="wl-dot" style={{ background: workspaceColorFor(workspace.id) }} />
                <span className="name">{workspace.name}</span>
              </button>
            ))}
            {workspaces.length === 0 && <p className="wl-empty">No workspaces found.</p>}
          </div>
        </div>
      ) : (
        <div className="wl-rail thin-scrollbar">
          <button type="button" className="tile add" title="New workspace" onClick={onCreateClick}>
            <PlusIcon className="w-4 h-4" />
          </button>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              title={workspace.name}
              className={cn('tile', workspace.id === activeId && 'on')}
              onClick={() => onSelect(workspace.id)}
            >
              <span className="wl-dot" style={{ background: workspaceColorFor(workspace.id) }} />
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
