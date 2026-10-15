import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Workspace } from '../types'

interface WorkspaceCardProps {
  workspace: Workspace
  ownerName: string
  isPersonal: boolean
  onDelete: (id: string) => void
  onRename: (id: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface DropdownMenuProps {
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}

function DropdownMenu({ onRename, onDelete, onClose }: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-7 z-20 min-w-[150px] bg-white border border-line rounded-lg py-1 shadow-lg"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onRename()
          onClose()
        }}
        className="w-full text-left px-3 py-1.5 text-[13px] text-ink hover:bg-cream-soft transition-colors"
      >
        Rename
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
          onClose()
        }}
        className="w-full text-left px-3 py-1.5 text-[13px] text-warn hover:bg-cream-soft transition-colors"
      >
        Delete
      </button>
    </div>
  )
}

export function WorkspaceCard({ workspace, ownerName, isPersonal, onDelete, onRename }: WorkspaceCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Card className="cursor-pointer relative" onClick={() => navigate(`/workspaces/${workspace.id}`)}>
      <div className="flex items-start justify-between mb-3.5">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-brand-tint flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0f6e4c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M4 10h16M10 10v10" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={isPersonal ? 'personal' : 'team'}>{isPersonal ? 'personal' : 'team'}</Badge>
          {/* ⋯ Menu button */}
          <div className="relative">
            <button
              type="button"
              aria-label="Workspace actions"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((open) => !open)
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-cream-soft transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <DropdownMenu
                onRename={() => onRename(workspace.id)}
                onDelete={() => onDelete(workspace.id)}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      <h3 className="text-[15px] font-semibold mb-1">{workspace.name}</h3>
      <div className="font-mono text-xs text-muted mb-4">created {formatDate(workspace.created_at)}</div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <Avatar name={ownerName} size={20} />
      </div>
    </Card>
  )
}