import { forwardRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { Input } from '@/shared/components/ui/Input'
import { ContextMenu } from '@/shared/components/ui/ContextMenu'
import { IconButton } from '@/shared/components/ui/IconButton'
import { ArrowRightIcon, MoreIcon, NodesIcon, TableIcon } from '@/shared/components/ui/icons'
import { RunBadge } from '@/modules/runs/components/RunBadge'
import { WorkspaceListItem } from '../types'
import { workspaceColorFor } from '../lib/color'
import { openWithTransition } from '../lib/open-transition'
import { formatAbsolute, formatRelative, nodeCount, plural, touchWorkspace } from '../lib/activity'
import { PipelineThumb } from './PipelineThumb'

interface WorkspaceCardProps {
  workspace: WorkspaceListItem
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  isDeleting: boolean
  isHighlighted?: boolean
}

export const WorkspaceCard = forwardRef<HTMLDivElement, WorkspaceCardProps>(function WorkspaceCard(
  { workspace, onDelete, onRename, isDeleting, isHighlighted },
  ref,
) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState(workspace.name)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const nodes = nodeCount(workspace)
  const editedAt = workspace.updated_at ?? workspace.created_at
  const lastRun = workspace.last_run

  function submitRename() {
    const trimmed = nameDraft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== workspace.name) onRename(workspace.id, trimmed)
    else setNameDraft(workspace.name)
  }

  function open(card: HTMLElement) {
    touchWorkspace(workspace.id)
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
        <span className="date" title={`Last modified ${formatAbsolute(editedAt)}`}>
          edited {formatRelative(editedAt)}
        </span>

        <div className="wsc-stats">
          <span className={cn(nodes === 0 && 'zero')} title={plural(nodes, 'node') + ' in the pipeline'}>
            <NodesIcon />
            {plural(nodes, 'node')}
          </span>
          <span className={cn(workspace.dataset_count === 0 && 'zero')} title={plural(workspace.dataset_count, 'dataset') + ' imported'}>
            <TableIcon />
            {plural(workspace.dataset_count, 'dataset')}
          </span>
        </div>
      </div>

      <div className="wsc-foot">
        {lastRun ? (
          <div className="run" title={`Last run ${formatAbsolute(lastRun.created_at)}`}>
            <RunBadge status={lastRun.status} />
            <span>{formatRelative(lastRun.created_at)}</span>
          </div>
        ) : (
          <div className="run none">Never run</div>
        )}
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
