import { useEffect, useState } from 'react'
import { Handle, NodeProps, Position } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'
import { NodeDescriptor } from '@/modules/editor/types'
import { NodeIcon, PencilIcon, TrashIcon } from '../nodes/icons'
import { NodeTip, countMissingParams, useHoverRect } from './NodeTip'

export const NODE_DELETE_EVENT = 'canvas-node-delete'

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

export function PipelineNode({ id, data, selected, dragging }: NodeProps) {
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

  function startEditing() {
    hide()
    setDraft(label)
    setIsEditing(true)
  }

  function submitRename() {
    const trimmed = draft.trim()
    setIsEditing(false)
    if (trimmed && trimmed !== label) onRename?.(trimmed)
    else setDraft(label)
  }

  function requestDelete() {
    hide()
    window.dispatchEvent(new CustomEvent<string>(NODE_DELETE_EVENT, { detail: id }))
  }

  const inPorts = descriptor?.fan_in ? descriptor.in_ports ?? [] : []
  const outPorts = descriptor && descriptor.ports_out.length > 1 ? descriptor.ports_out : []
  const needsSetup = !hasError && countMissingParams(descriptor, params) > 0

  return (
    <div
      className={cn('nx', selected && 'selected', hasError && 'error', needsSetup && 'setup', highlighted && 'hl')}
      data-cat={category}
      onPointerEnter={(event) => !dragging && show(event.currentTarget)}
      onPointerLeave={hide}
    >
      <div className="nx-tile">
        {inPorts.length === 2 ? (
          <>
            <Handle type="target" position={Position.Left} id={inPorts[0]} style={{ top: '30%' }} className="nx-handle" />
            <Handle type="target" position={Position.Left} id={inPorts[1]} style={{ top: '70%' }} className="nx-handle" />
          </>
        ) : (
          <Handle type="target" position={Position.Left} className="nx-handle" />
        )}

        <NodeIcon type={nodeType} category={category} className="nx-icon" />

        {hasError && <span className="nx-badge err">!</span>}
        {needsSetup && <span className="nx-badge warn">!</span>}

        {!isEditing && (
          <div className="nx-bar nodrag nopan" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" aria-label="Rename node" onClick={startEditing}>
              <PencilIcon />
            </button>
            <button type="button" className="danger" aria-label="Delete node" onClick={requestDelete}>
              <TrashIcon />
            </button>
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
              className="nx-handle"
            />
          ))
        ) : (
          <Handle type="source" position={Position.Right} className="nx-handle" />
        )}
      </div>

      <div className="nx-label">
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
              startEditing()
            }}
          >
            {label}
          </span>
        )}
      </div>
      <small className="nx-type">{nodeType}</small>

      {rect && !isEditing && !dragging && (
        <NodeTip rect={rect} label={label} nodeType={nodeType} category={category} descriptor={descriptor} params={params} hasError={hasError} errorMessages={errorMessages} />
      )}
    </div>
  )
}
