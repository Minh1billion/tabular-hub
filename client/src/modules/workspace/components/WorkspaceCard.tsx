import { useNavigate } from 'react-router-dom'
import { forwardRef, useState } from 'react'
import { Card } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Input } from '@/shared/components/ui/Input'
import { ContextMenu } from '@/shared/components/ui/ContextMenu'
import { Workspace } from '../types'
import { workspaceColorFor } from '../lib/color'

interface WorkspaceCardProps {
  workspace: Workspace
  ownerName: string
  isPersonal: boolean
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  isDeleting: boolean
  isHighlighted?: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const WorkspaceCard = forwardRef<HTMLDivElement, WorkspaceCardProps>(function WorkspaceCard(
  { workspace, ownerName, isPersonal, onDelete, onRename, isDeleting, isHighlighted },
  ref,
) {
  const navigate = useNavigate()
  const accentColor = workspaceColorFor(workspace.id)
  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(workspace.name)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  function submitRename() {
    const trimmed = nameDraft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== workspace.name) onRename(workspace.id, trimmed)
    else setNameDraft(workspace.name)
  }

  return (
    <Card
      ref={ref}
      highlighted={isHighlighted}
      className="cursor-pointer border-2 !border-black"
      onClick={() => navigate(`/workspaces/${workspace.id}`)}
      onContextMenu={(event) => {
        event.preventDefault()
        setContextMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      <div className="flex items-start justify-between mb-3.5">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center"
          style={{ background: `color-mix(in srgb, ${accentColor} 16%, white)` }}
        >
          <svg className="w-4 h-4" style={{ color: accentColor }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M4 10h16M10 10v10" />
          </svg>
        </div>
        <Badge tone={isPersonal ? 'personal' : 'team'}>{isPersonal ? 'personal' : 'team'}</Badge>
      </div>

      {isEditing ? (
        <Input
          autoFocus
          maxLength={200}
          value={nameDraft}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setNameDraft(event.target.value)}
          onBlur={submitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitRename()
            if (event.key === 'Escape') {
              setNameDraft(workspace.name)
              setIsEditing(false)
            }
          }}
          className="mb-1"
        />
      ) : (
        <h3 className="text-[15px] font-semibold truncate min-w-0 mb-1">{workspace.name}</h3>
      )}
      <div className="font-mono text-xs text-muted mb-4">created {formatDate(workspace.created_at)}</div>

      <div className="flex items-center border-t border-line pt-3">
        <Avatar name={ownerName} size={20} />
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Rename', onClick: () => setIsEditing(true) },
            {
              label: isDeleting ? 'Deleting…' : 'Delete',
              destructive: true,
              onClick: () => {
                if (!isDeleting) onDelete(workspace.id)
              },
            },
          ]}
        />
      )}
    </Card>
  )
})