import { Input } from '@/shared/components/ui/Input'
import { NodeDescriptor } from '@/modules/nodes/types'
import { useResources } from '@/modules/resources/hooks'
import { GraphNode } from '../types'

interface NodeInspectorProps {
  workspaceId: string
  node: GraphNode
  descriptor?: NodeDescriptor
  onChange: (params: Record<string, unknown>) => void
  onClose: () => void
}

const INTERNAL_IO_NODE_TYPES = new Set(['fetch_internal', 'push_internal'])

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

function ParamField({
  fieldName,
  typeName,
  value,
  onChange,
}: {
  fieldName: string
  typeName: string
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (typeName === 'bool') {
    return (
      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        {fieldName}
      </label>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-mono text-muted uppercase">{fieldName}</label>
      <Input
        value={fieldValueToText(value, typeName)}
        onChange={(event) => onChange(textToFieldValue(event.target.value, typeName))}
        placeholder={typeName}
      />
    </div>
  )
}

export function NodeInspector({ workspaceId, node, descriptor, onChange, onClose }: NodeInspectorProps) {
  const isInternalIoNode = INTERNAL_IO_NODE_TYPES.has(node.type)
  const { data: resources } = useResources(workspaceId)

  function setParam(fieldName: string, value: unknown) {
    onChange({ ...node.params, [fieldName]: value })
  }

  function renderField(fieldName: string, typeName: string) {
    if (fieldName === 'bucket') return null

    if (isInternalIoNode && fieldName === 'key') {
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

    return (
      <ParamField
        key={fieldName}
        fieldName={fieldName}
        typeName={typeName}
        value={node.params[fieldName]}
        onChange={(value) => setParam(fieldName, value)}
      />
    )
  }

  return (
    <div className="w-[260px] bg-white border-l border-line flex flex-col p-4 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-headline font-semibold text-sm truncate">{node.name}</h2>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6 18 18M6 18 18 6" />
          </svg>
        </button>
      </div>

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
  )
}