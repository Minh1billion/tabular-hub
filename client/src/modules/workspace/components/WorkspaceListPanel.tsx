import { useMemo, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { Workspace } from '../types'

const nodeColors = ['#17A672', '#5B8FD6', '#C2540E', '#8A6FD1', '#B8B08C']

function nodeColorFor(id: string) {
  const index = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return nodeColors[index % nodeColors.length]
}

interface WorkspaceListPanelProps {
  workspaces: Workspace[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreateClick: () => void
}

export function WorkspaceListPanel({ workspaces, activeId, onSelect, onCreateClick }: WorkspaceListPanelProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 150)

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase()
    if (!term) return workspaces
    return workspaces.filter((workspace) => workspace.name.toLowerCase().includes(term))
  }, [workspaces, debouncedQuery])

  return (
    <div className="w-[280px] bg-white border-r border-line flex flex-col p-5">
      <h1 className="font-headline font-semibold text-lg mb-4">Workspaces</h1>

      <button
        type="button"
        onClick={onCreateClick}
        className="w-full flex items-center justify-center gap-2 py-[9px] bg-brand text-[#eff9f4] rounded-lg font-medium text-[13.5px] mb-3.5 transition-colors hover:bg-brand-hover"
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
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspaces…"
          className="flex-1 outline-none bg-transparent placeholder:text-muted text-ink"
        />
      </div>

      <div className="flex flex-col gap-0.5 flex-1 overflow-auto">
        {filtered.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            onClick={() => onSelect(workspace.id)}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors',
              workspace.id === activeId ? 'bg-brand-tint' : 'hover:bg-cream-soft',
            )}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: nodeColorFor(workspace.id) }}
            />
            <span
              className={cn(
                'flex-1 text-[13.5px] font-medium truncate',
                workspace.id === activeId ? 'text-[#0f6e4c]' : 'text-ink',
              )}
            >
              {workspace.name}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted px-2.5 py-4">No workspaces found.</p>
        )}
      </div>
    </div>
  )
}
