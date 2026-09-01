import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Workspace } from '../types'

const nodeColors = [
  'var(--brand)',
  'var(--accent-teal)',
  'var(--accent-clay)',
  'var(--accent-plum)',
  'var(--accent-gold)',
  'var(--accent-olive)',
]

function nodeColorFor(id: string) {
  const index = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return nodeColors[index % nodeColors.length]
}

interface WorkspaceListPanelProps {
  workspaces: Workspace[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreateClick: () => void
  query: string
  onQueryChange: (value: string) => void
}

export function WorkspaceListPanel({
  workspaces,
  onSelect,
  onCreateClick,
  query,
  onQueryChange,
}: WorkspaceListPanelProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <div
      className={cn(
        'm-3 border-2 border-black rounded-panel bg-white flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out',
        isOpen ? 'w-[280px]' : 'w-[52px]',
      )}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black shrink-0">
        <h1
          className={cn(
            'font-headline font-semibold text-lg whitespace-nowrap overflow-hidden transition-all duration-200 ease-in-out',
            isOpen ? 'max-w-[200px] opacity-100' : 'max-w-0 opacity-0',
          )}
        >
          Workspaces
        </h1>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="text-muted hover:text-ink transition-colors shrink-0"
        >
          <svg
            className={cn('w-3.5 h-3.5 transition-transform', isOpen ? '' : 'rotate-180')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <div
        className={cn(
          'w-[280px] shrink-0 flex-1 min-h-0 flex flex-col p-5 transition-opacity duration-200 ease-in-out',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <button
          type="button"
          onClick={onCreateClick}
          className="w-full flex items-center justify-center gap-2 py-[9px] bg-brand text-[#eff9f4] rounded-lg font-medium text-[13.5px] mb-3.5 border-[1.5px] border-black transition-colors hover:bg-brand-hover"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New workspace
        </button>

        <div className="flex items-center gap-2 px-2.5 py-2 border border-line rounded-lg text-muted text-[13px] mb-4.5">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search workspaces…"
            className="flex-1 outline-none bg-transparent placeholder:text-muted text-ink"
          />
        </div>

        <div className="flex flex-col gap-0.5 flex-1 overflow-auto">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onSelect(workspace.id)}
              className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors hover:bg-cream-soft"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: nodeColorFor(workspace.id) }}
              />
              <span className="flex-1 text-[13.5px] font-medium truncate text-ink">
                {workspace.name}
              </span>
            </button>
          ))}
          {workspaces.length === 0 && (
            <p className="text-xs text-muted px-2.5 py-4">No workspaces found.</p>
          )}
        </div>
      </div>
    </div>
  )
}