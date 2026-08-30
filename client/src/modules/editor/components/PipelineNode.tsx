import { Handle, NodeProps, Position } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'
import { NodeDescriptor } from '@/modules/editor/types'

export interface PipelineNodeData {
  label: string
  nodeType: string
  params: Record<string, unknown>
  descriptor?: NodeDescriptor
  hasError?: boolean
  [key: string]: unknown
}

const handleClasses = '!w-2.5 !h-2.5 !border-2 !border-white !bg-muted hover:!bg-brand transition-colors'

export function PipelineNode({ data, selected }: NodeProps) {
  const { label, nodeType, descriptor, hasError } = data as PipelineNodeData

  const inPorts = descriptor?.fan_in ? descriptor.in_ports ?? [] : []
  const outPorts = descriptor && descriptor.ports_out.length > 1 ? descriptor.ports_out : []

  return (
    <div
      className={cn(
        'relative min-w-[168px] bg-white border rounded-card px-3.5 py-3 transition-colors',
        hasError
          ? 'border-warn shadow-[0_0_0_1.5px_var(--warn)]'
          : selected
            ? 'border-brand shadow-[0_0_0_1.5px_var(--brand)]'
            : 'border-line',
      )}
    >
      {inPorts.length === 2 ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id={inPorts[0]}
            style={{ top: '32%' }}
            className={handleClasses}
          />
          <span className="absolute -left-1 top-[22%] font-mono text-[8px] text-muted -translate-x-full pr-1">
            {inPorts[0]}
          </span>
          <Handle
            type="target"
            position={Position.Left}
            id={inPorts[1]}
            style={{ top: '68%' }}
            className={handleClasses}
          />
          <span className="absolute -left-1 top-[58%] font-mono text-[8px] text-muted -translate-x-full pr-1">
            {inPorts[1]}
          </span>
        </>
      ) : (
        <Handle type="target" position={Position.Left} className={handleClasses} />
      )}

      <div className="font-mono text-[10px] tracking-wide text-muted mb-1 uppercase">{nodeType}</div>
      <div className="text-[13.5px] font-medium text-ink truncate">{label}</div>

      {outPorts.length > 0 ? (
        outPorts.map((port, index) => (
          <Handle
            key={port}
            type="source"
            position={Position.Right}
            id={port}
            style={{ top: `${((index + 1) / (outPorts.length + 1)) * 100}%` }}
            className={handleClasses}
          />
        ))
      ) : (
        <Handle type="source" position={Position.Right} className={handleClasses} />
      )}
    </div>
  )
}