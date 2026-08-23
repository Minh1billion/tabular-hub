import { Handle, NodeProps, Position } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'

export interface PipelineNodeData {
  label: string
  nodeType: string
  [key: string]: unknown
}

const handleClasses = '!w-2.5 !h-2.5 !border-2 !border-white !bg-muted hover:!bg-brand transition-colors'

export function PipelineNode({ data, selected }: NodeProps) {
  const { label, nodeType } = data as PipelineNodeData

  return (
    <div
      className={cn(
        'min-w-[168px] bg-white border rounded-card px-3.5 py-3 transition-colors',
        selected ? 'border-brand shadow-[0_0_0_1.5px_var(--brand)]' : 'border-line',
      )}
    >
      <Handle type="target" position={Position.Left} className={handleClasses} />

      <div className="font-mono text-[10px] tracking-wide text-muted mb-1 uppercase">{nodeType}</div>
      <div className="text-[13.5px] font-medium text-ink truncate">{label}</div>

      <Handle type="source" position={Position.Right} className={handleClasses} />
    </div>
  )
}