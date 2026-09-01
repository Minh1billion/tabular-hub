import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { NodeDescriptor } from '@/modules/editor/types'
import { useResources } from '@/modules/resources/hooks'
import { GraphNode } from '../../types'

interface NodeInspectorProps {
  workspaceId: string
  node: GraphNode
  descriptor?: NodeDescriptor
  onChange: (params: Record<string, unknown>) => void
  onClose: () => void
}

const RESOURCE_KEY_DROPDOWN_NODE_TYPES = new Set(['fetch_internal'])

function fieldValueToText(value: unknown, typeName: string): string {
  if (value === undefined) return ''
  if (typeName.startsWith('list[')) return Array.isArray(value) ? value.join(', ') : ''
  if (typeName === 'dict' || typeName === 'object') {
    if (typeof value === 'string') return value
    return value === null ? '' : JSON.stringify(value)
  }
  return String(value)
}

function textToFieldValue(text: string, typeName: string): unknown {
  if (typeName === 'bool') return text === 'true'
  if (typeName === 'int') return text.trim() === '' ? undefined : parseInt(text, 10)
  if (typeName === 'float') return text.trim() === '' ? undefined : parseFloat(text)
  if (typeName.startsWith('list[')) {
    return text
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (typeName === 'dict' || typeName === 'object') {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

function validateText(text: string, typeName: string): string | null {
  if (typeName === 'int') {
    if (text.trim() === '') return null
    return /^-?\d+$/.test(text.trim()) ? null : 'Must be an integer'
  }
  if (typeName === 'float') {
    if (text.trim() === '') return null
    return /^-?\d+(\.\d+)?$/.test(text.trim()) ? null : 'Must be a number'
  }
  if (typeName === 'dict' || typeName === 'object') {
    if (text.trim() === '') return null
    try {
      JSON.parse(text)
      return null
    } catch {
      return 'Must be valid JSON'
    }
  }
  return null
}

function ParamField({
  fieldName,
  typeName,
  text,
  error,
  checked,
  onTextChange,
  onCheckedChange,
}: {
  fieldName: string
  typeName: string
  text: string
  error?: string
  checked: boolean
  onTextChange: (value: string) => void
  onCheckedChange: (value: boolean) => void
}) {
  if (typeName === 'bool') {
    return (
      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} />
        {fieldName}
      </label>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-mono text-muted uppercase">{fieldName}</label>
      <Input value={text} onChange={(event) => onTextChange(event.target.value)} placeholder={typeName} />
      {error && <span className="text-[11px] text-warn">{error}</span>}
    </div>
  )
}

export function NodeInspector({ workspaceId, node, descriptor, onChange, onClose }: NodeInspectorProps) {
  const usesResourceKeyDropdown = RESOURCE_KEY_DROPDOWN_NODE_TYPES.has(node.type)
  const { data: resources } = useResources(workspaceId)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    dragging.current = true
    const startX = event.clientX
    const startY = event.clientY
    const start = offset

    function onMove(moveEvent: PointerEvent) {
      if (!dragging.current) return
      setOffset({ x: start.x + (moveEvent.clientX - startX), y: start.y + (moveEvent.clientY - startY) })
    }

    function onUp() {
      dragging.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function setParam(fieldName: string, value: unknown) {
    onChange({ ...node.params, [fieldName]: value })
  }

  function handleFieldInput(fieldName: string, typeName: string, text: string) {
    setDrafts((current) => ({ ...current, [fieldName]: text }))
    const error = validateText(text, typeName)
    setErrors((current) => ({ ...current, [fieldName]: error ?? '' }))
    if (!error) setParam(fieldName, textToFieldValue(text, typeName))
  }

  function renderField(fieldName: string, typeName: string) {
    if (fieldName === 'bucket') return null

    if (usesResourceKeyDropdown && fieldName === 'key') {
      return (
        <div key={fieldName} className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted uppercase">{fieldName}</label>
          <select
            className="w-full px-3 py-2 text-sm border border-line rounded-lg bg-white text-ink outline-none focus:border-brand transition-colors"
            value={typeof node.params[fieldName] === 'string' ? (node.params[fieldName] as string) : ''}
            onChange={(event) => setParam(fieldName, event.target.value)}
          >
            <option value="" disabled>
              Select a resource
            </option>
            {(resources?.keys ?? []).map((resourceKey) => (
              <option key={resourceKey} value={resourceKey}>
                {resourceKey}
              </option>
            ))}
          </select>
        </div>
      )
    }

    const text = drafts[fieldName] ?? fieldValueToText(node.params[fieldName], typeName)

    return (
      <ParamField
        key={fieldName}
        fieldName={fieldName}
        typeName={typeName}
        text={text}
        error={errors[fieldName]}
        checked={Boolean(node.params[fieldName])}
        onTextChange={(value) => handleFieldInput(fieldName, typeName, value)}
        onCheckedChange={(value) => setParam(fieldName, value)}
      />
    )
  }

  return (
    <div
      className="absolute top-4 right-4 z-20 w-[260px] max-h-[calc(100%-32px)] bg-white border-2 border-black rounded-panel flex flex-col overflow-hidden shadow-lg"
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <div
        onPointerDown={startDrag}
        className="flex items-center justify-between px-4 py-3 border-b-2 border-black cursor-grab active:cursor-grabbing shrink-0"
      >
        <h2 className="font-headline font-semibold text-sm truncate">{node.name}</h2>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6 18 18M6 18 18 6" />
          </svg>
        </button>
      </div>

      <div className="p-4 overflow-auto">
        <div className="font-mono text-[10px] tracking-wide text-muted uppercase mb-3">{node.type}</div>

        {!descriptor ? (
          <p className="text-[12px] text-muted">Unknown node type.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(descriptor.required).map(([fieldName, typeName]) => renderField(fieldName, typeName))}
            {Object.entries(descriptor.optional).map(([fieldName, typeName]) => renderField(fieldName, typeName))}
            {Object.keys(descriptor.required).length === 0 && Object.keys(descriptor.optional).length === 0 && (
              <p className="text-[12px] text-muted">No params for this node.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}