import { useEffect, useState } from 'react'
import { Handle, NodeProps, Position } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'
import { NodeDescriptor } from '@/modules/editor/types'

export interface PipelineNodeData {
  label: string
  nodeType: string
  params: Record<string, unknown>
  descriptor?: NodeDescriptor
  hasError?: boolean
  onRename?: (name: string) => void
  renameSignal?: number
  [key: string]: unknown
}

const handleClasses = '!w-2.5 !h-2.5 !border-2 !border-white !bg-muted hover:!bg-brand transition-colors'

export function PipelineNode({ data, selected }: NodeProps) {
  const { label, nodeType, descriptor, hasError, onRename, renameSignal } = data as PipelineNodeData
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(label)

  useEffect(() => {
    if (renameSignal) {
      setDraft(label)
      setIsEditing(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameSignal])

  function submitRename() {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== label) onRename?.(trimmed)
    else setDraft(label)
  }

  const inPorts = descriptor?.fan_in ? descriptor.in_ports ?? [] : []
  const outPorts = descriptor && descriptor.ports_out.length > 1 ? descriptor.ports_out : []

  return (
    <div
      className={cn(
        'relative w-[200px] bg-white border-2 rounded-card px-3.5 py-3 transition-colors',
        hasError
          ? 'border-warn shadow-[0_0_0_1.5px_var(--warn)]'
          : selected
            ? 'border-brand shadow-[0_0_0_1.5px_var(--brand)]'
            : 'border-black',
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

      <div className="font-mono text-[10px] tracking-wide text-muted mb-1 uppercase truncate">{nodeType}</div>
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={submitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitRename()
            if (event.key === 'Escape') {
              setDraft(label)
              setIsEditing(false)
            }
          }}
          className="nodrag nopan w-full text-[13.5px] font-medium text-ink bg-transparent outline-none border-b border-brand"
        />
      ) : (
        <div
          className="text-[13.5px] font-medium text-ink truncate cursor-text hover:text-brand hover:underline transition-colors"
          onDoubleClick={(event) => {
            event.stopPropagation()
            setIsEditing(true)
          }}
        >
          {label}
        </div>
      )}

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