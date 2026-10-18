import { useState } from 'react'
import { Input } from '@/shared/components/ui/Input'
import { Toggle } from '@/shared/components/ui/Toggle'
import { Badge } from '@/shared/components/ui/Badge'
import { Select } from '@/shared/components/ui/Select'
import { TableIcon } from '@/shared/components/ui/icons'
import { CategoryIcon } from '../category'
import { NodeDescriptor } from '@/modules/editor/types'
import { useResources } from '@/modules/resources/hooks'
import { GraphNode } from '../../types'

interface NodeInspectorProps {
  workspaceId: string
  node: GraphNode
  descriptor?: NodeDescriptor
  category?: string
  onChange: (params: Record<string, unknown>) => void
  onRename: (name: string) => void
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
  required,
  text,
  error,
  checked,
  onTextChange,
  onCheckedChange,
}: {
  fieldName: string
  typeName: string
  required: boolean
  text: string
  error?: string
  checked: boolean
  onTextChange: (value: string) => void
  onCheckedChange: (value: boolean) => void
}) {
  if (typeName === 'bool') {
    return (
      <div className="field">
        <span className="field-label">{fieldName}</span>
        <Toggle on={checked} onChange={onCheckedChange} label={checked ? 'Enabled' : 'Disabled'} />
      </div>
    )
  }

  return (
    <div className="field">
      <label className="field-label">
        {fieldName}
        {required && <i>*</i>}
      </label>
      <Input value={text} onChange={(e) => onTextChange(e.target.value)} placeholder={typeName} />
      {error && <span className="err">{error}</span>}
    </div>
  )
}

export function NodeInspector({ workspaceId, node, descriptor, category = 'Transform', onChange, onRename }: NodeInspectorProps) {
  const usesResourceKeyDropdown = RESOURCE_KEY_DROPDOWN_NODE_TYPES.has(node.type)
  const { data: resources, isLoading: isLoadingResources } = useResources(workspaceId)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(node.name)

  function submitRename() {
    const trimmed = nameDraft.trim()
    setIsEditingName(false)
    if (trimmed && trimmed !== node.name) onRename(trimmed)
    else setNameDraft(node.name)
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

  function renderField(fieldName: string, typeName: string, required: boolean) {
    if (fieldName === 'bucket') return null

    if (usesResourceKeyDropdown && fieldName === 'key') {
      return (
        <div key={fieldName} className="field">
          <label className="field-label">
            {fieldName}
            {required && <i>*</i>}
          </label>
          <Select
            value={typeof node.params[fieldName] === 'string' ? (node.params[fieldName] as string) : ''}
            options={(resources?.keys ?? []).map((resourceKey) => ({ value: resourceKey, label: resourceKey, icon: <TableIcon /> }))}
            onChange={(value) => setParam(fieldName, value)}
            placeholder="Select a resource"
            emptyText="No datasets yet — import one from the Resources tab"
            loading={isLoadingResources}
          />
        </div>
      )
    }

    const text = drafts[fieldName] ?? fieldValueToText(node.params[fieldName], typeName)

    return (
      <ParamField
        key={fieldName}
        fieldName={fieldName}
        typeName={typeName}
        required={required}
        text={text}
        error={errors[fieldName]}
        checked={Boolean(node.params[fieldName])}
        onTextChange={(value) => handleFieldInput(fieldName, typeName, value)}
        onCheckedChange={(value) => setParam(fieldName, value)}
      />
    )
  }

  const required = descriptor ? Object.entries(descriptor.required) : []
  const optional = descriptor ? Object.entries(descriptor.optional) : []

  return (
    <div data-cat={category}>
      <div className="insp-head">
        <span className="cat-tile">
          <CategoryIcon category={category} />
        </span>
        {isEditingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename()
              if (e.key === 'Escape') {
                setNameDraft(node.name)
                setIsEditingName(false)
              }
            }}
            className="insp-name-input"
          />
        ) : (
          <h2
            className="insp-name m-0"
            title="Double-click to rename"
            onDoubleClick={() => {
              setNameDraft(node.name)
              setIsEditingName(true)
            }}
          >
            {node.name}
          </h2>
        )}
        <Badge tone="personal">{node.type}</Badge>
      </div>

      {!descriptor ? (
        <p className="dock-empty">Unknown node type.</p>
      ) : required.length === 0 && optional.length === 0 ? (
        <p className="dock-empty">No params for this node.</p>
      ) : (
        <div className="insp-grid">
          {required.map(([f, t]) => renderField(f, t, true))}
          {optional.map(([f, t]) => renderField(f, t, false))}
        </div>
      )}
    </div>
  )
}
