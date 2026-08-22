import { Card } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Workspace } from '../types'

interface WorkspaceCardProps {
  workspace: Workspace
  ownerName: string
  isPersonal: boolean
  onDelete: (id: string) => void
  isDeleting: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WorkspaceCard({ workspace, ownerName, isPersonal, onDelete, isDeleting }: WorkspaceCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3.5">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-brand-tint flex items-center justify-center">
          <svg className="w-4 h-4 text-[#0f6e4c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M4 10h16M10 10v10" />
          </svg>
        </div>
        <Badge tone={isPersonal ? 'personal' : 'team'}>{isPersonal ? 'personal' : 'team'}</Badge>
      </div>

      <h3 className="text-[15px] font-semibold mb-1">{workspace.name}</h3>
      <div className="font-mono text-xs text-muted mb-4">created {formatDate(workspace.created_at)}</div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <Avatar name={ownerName} size={20} />
        <button
          type="button"
          onClick={() => onDelete(workspace.id)}
          disabled={isDeleting}
          className="text-xs text-muted hover:text-warn transition-colors disabled:opacity-50"
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Card>
  )
}
