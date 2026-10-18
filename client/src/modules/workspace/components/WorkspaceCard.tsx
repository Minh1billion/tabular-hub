import { forwardRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/components/ui/Badge'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Input } from '@/shared/components/ui/Input'
import { ContextMenu } from '@/shared/components/ui/ContextMenu'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ArrowRightIcon, MoreIcon } from '@/shared/components/ui/icons'
import { Workspace } from '../types'
import { workspaceColorFor } from '../lib/color'
import { openWithTransition } from '../lib/open-transition'
import { PipelineThumb } from './PipelineThumb'

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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const WorkspaceCard = forwardRef<HTMLDivElement, WorkspaceCardProps>(function WorkspaceCard(
  { workspace, ownerName, isPersonal, onDelete, onRename, isDeleting, isHighlighted },
  ref,
) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(workspace.name)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  function submitRename() {
    const trimmed = nameDraft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== workspace.name) onRename(workspace.id, trimmed)
    else setNameDraft(workspace.name)
  }

  function open(card: HTMLElement) {
    openWithTransition(card, () => navigate(`/workspaces/${workspace.id}`))
  }

  return (
    <div
      ref={ref}
      role="link"
      tabIndex={0}
      className={cn('wsc', isHighlighted && 'flash', isDeleting && 'deleting')}
      style={{ ['--accent' as string]: workspaceColorFor(workspace.id) }}
      onClick={(event) => !isEditing && open(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !isEditing && event.target === event.currentTarget) open(event.currentTarget)
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        setContextMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      <div className="wsc-thumb">
        <PipelineThumb spec={workspace.spec} fallback={workspace.id} />
        <div className={cn('wsc-menu', contextMenu && 'open')}>
          <IconButton
            size="sm"
            tip="Actions"
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              setContextMenu({ x: rect.left, y: rect.bottom + 6 })
            }}
          >
            <MoreIcon className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div className="wsc-body">
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
          />
        ) : (
          <h3 title={workspace.name}>{workspace.name}</h3>
        )}
        <span className="date">created {formatDate(workspace.created_at)}</span>
      </div>

      <div className="wsc-foot">
        <div className="who">
          <Avatar name={ownerName} size={22} />
          <Badge tone={isPersonal ? 'personal' : 'team'}>{isPersonal ? 'personal' : 'team'}</Badge>
        </div>
        <span className="open">
          Open <ArrowRightIcon />
        </span>
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
    </div>
  )
})
