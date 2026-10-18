import { useEffect, useState } from 'react'
import { Handle, NodeProps, Position } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'
import { NodeDescriptor } from '@/modules/editor/types'
import { CategoryIcon } from '../nodes/category'
import { NodeTip, useHoverRect } from './NodeTip'

export interface PipelineNodeData {
  label: string
  nodeType: string
  category?: string
  params: Record<string, unknown>
  descriptor?: NodeDescriptor
  hasError?: boolean
  errorMessages?: string[]
  highlighted?: boolean
  onRename?: (name: string) => void
  renameSignal?: number
  [key: string]: unknown
}

export function PipelineNode({ data, selected, dragging }: NodeProps) {
  const nodeData = data as PipelineNodeData
  const { label, nodeType, category = 'Transform', params, descriptor, hasError, errorMessages, highlighted, onRename, renameSignal } = nodeData
  const { rect, show, hide } = useHoverRect()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(label)

  useEffect(() => {
    if (dragging) hide()
  }, [dragging, hide])

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
      className={cn('pn', selected && 'selected', hasError && 'error', highlighted && 'hl')}
      data-cat={category}
      onPointerEnter={(event) => !dragging && show(event.currentTarget)}
      onPointerLeave={hide}
    >
      {inPorts.length === 2 ? (
        <>
          <Handle type="target" position={Position.Left} id={inPorts[0]} style={{ top: '30%' }} className="pn-handle" />
          <Handle type="target" position={Position.Left} id={inPorts[1]} style={{ top: '70%' }} className="pn-handle" />
        </>
      ) : (
        <Handle type="target" position={Position.Left} className="pn-handle" />
      )}

      <span className="pn-icon cat-tile">
        <CategoryIcon category={category} />
      </span>

      <div className="pn-title">
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename()
              if (e.key === 'Escape') {
                setDraft(label)
                setIsEditing(false)
              }
            }}
            className="nodrag nopan"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation()
              setDraft(label)
              setIsEditing(true)
            }}
          >
            {label}
          </span>
        )}
      </div>

      {hasError && <span className="pn-flag">!</span>}

      {outPorts.length > 0 ? (
        outPorts.map((port, index) => (
          <Handle
            key={port}
            type="source"
            position={Position.Right}
            id={port}
            style={{ top: `${((index + 1) / (outPorts.length + 1)) * 100}%` }}
            className="pn-handle"
          />
        ))
      ) : (
        <Handle type="source" position={Position.Right} className="pn-handle" />
      )}

      {rect && !isEditing && !dragging && (
        <NodeTip rect={rect} label={label} nodeType={nodeType} category={category} descriptor={descriptor} params={params} hasError={hasError} errorMessages={errorMessages} />
      )}
    </div>
  )
}
