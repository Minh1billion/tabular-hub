import { useState } from 'react'
import { Checkbox } from '@/shared/components/ui/Checkbox'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Select } from '@/shared/components/ui/Select'
import { CloseIcon, TableIcon } from '@/shared/components/ui/icons'
import { cn } from '@/shared/lib/cn'
import { useResources } from '@/modules/resources/hooks'
import { NodeSchema, ParamMeta } from '../../types'
import {
  asStringList,
  emptyColumnsText,
  firstColumn,
  hasSchema,
  inputColumns,
  isRecord,
  matchesDtype,
  numberError,
  parseNumber,
  valueKind,
} from '../lib/params'

export interface ParamContext {
  workspaceId: string
  params: Record<string, unknown>
  schema?: NodeSchema
  inPorts: string[] | null
  loading: boolean
}

export interface ControlProps {
  meta: ParamMeta
  typeName: string
  value: unknown
  onChange: (value: unknown) => void
  ctx: ParamContext
  placeholder?: string
  exclude?: Set<string>
}

type Meta<K extends ParamMeta['kind']> = Extract<ParamMeta, { kind: K }>

type SubProps<K extends ParamMeta['kind']> = Omit<ControlProps, 'meta' | 'typeName'> & { meta: Meta<K> }

type MapRow = [string, unknown]

function ListTextInput({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? asStringList(value).join(', ')

  return (
    <Input
      value={text}
      placeholder="col_a, col_b"
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(
          e.target.value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        )
      }}
    />
  )
}

function ColumnSelect({ meta, value, onChange, ctx, placeholder, exclude }: SubProps<'column'>) {
  const current = typeof value === 'string' ? value : ''

  if (!hasSchema(ctx.schema) && !ctx.loading) {
    return <Input value={current} placeholder="column name" onChange={(e) => onChange(e.target.value)} />
  }

  const options = inputColumns(ctx.schema, meta.scope, ctx.inPorts)
    .filter((column) => matchesDtype(column, meta.dtype) && !exclude?.has(column.name))
    .map((column) => ({ value: column.name, label: `${column.name} · ${column.dtype}` }))

  return (
    <Select
      value={current}
      options={options}
      onChange={onChange}
      placeholder={placeholder ?? 'Select a column'}
      emptyText={emptyColumnsText(ctx.schema, meta.dtype)}
      loading={ctx.loading}
    />
  )
}

function ColumnPicker({ meta, value, onChange, ctx }: SubProps<'columns'>) {
  const [query, setQuery] = useState('')
  const selected = asStringList(value)

  if (!hasSchema(ctx.schema) && !ctx.loading) {
    return <ListTextInput value={value} onChange={onChange} />
  }

  const columns = inputColumns(ctx.schema, meta.scope, ctx.inPorts)
  const known = new Set(columns.map((column) => column.name))
  const gone = selected.filter((name) => !known.has(name))
  const needle = query.trim().toLowerCase()
  const shown = columns.filter((column) => column.name.toLowerCase().includes(needle))

  function toggle(name: string) {
    onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name])
  }

  function selectAll() {
    onChange(columns.filter((column) => matchesDtype(column, meta.dtype)).map((column) => column.name))
  }

  return (
    <div className="cols">
      {columns.length > 8 && (
        <Input value={query} placeholder="Filter columns" onChange={(e) => setQuery(e.target.value)} />
      )}
      <div className="cols-bar">
        <span>{selected.length} selected</span>
        <button type="button" className="cols-link" onClick={selectAll}>
          All
        </button>
        <button type="button" className="cols-link" onClick={() => onChange([])}>
          None
        </button>
      </div>
      <div className="cols-list thin-scrollbar">
        {ctx.loading && columns.length === 0 && <div className="cols-empty">Loading…</div>}
        {!ctx.loading && columns.length === 0 && gone.length === 0 && (
          <div className="cols-empty">{emptyColumnsText(ctx.schema, undefined)}</div>
        )}
        {gone.map((name) => (
          <div key={`gone:${name}`} className="cols-item gone">
            <Checkbox label={name} checked onChange={() => toggle(name)} />
            <span className="cols-type">missing</span>
          </div>
        ))}
        {shown.map((column) => {
          const allowed = matchesDtype(column, meta.dtype)
          return (
            <div key={column.name} className={cn('cols-item', !allowed && 'off')}>
              <Checkbox
                label={column.name}
                checked={selected.includes(column.name)}
                disabled={!allowed}
                onChange={() => toggle(column.name)}
              />
              <span className="cols-type">{allowed ? column.dtype : `${column.dtype} · ${meta.dtype} only`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EnumSelect({ meta, value, onChange, placeholder }: SubProps<'enum'>) {
  return (
    <Select
      value={typeof value === 'string' ? value : ''}
      options={meta.options.map((option) => ({ value: option, label: option }))}
      onChange={onChange}
      placeholder={placeholder ?? 'Select…'}
    />
  )
}

function NumberField({
  typeName,
  minimum,
  value,
  onChange,
}: {
  typeName: string
  minimum?: number
  value: unknown
  onChange: (value: unknown) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? (typeof value === 'number' ? String(value) : '')
  const error = numberError(text, typeName, minimum)

  return (
    <>
      <Input
        inputMode="decimal"
        value={text}
        placeholder={typeName}
        onChange={(e) => {
          const next = e.target.value
          setDraft(next)
          if (!numberError(next, typeName, minimum)) onChange(parseNumber(next, typeName))
        }}
      />
      {error && <span className="err">{error}</span>}
    </>
  )
}

function TextField({ value, onChange, placeholder }: { value: unknown; onChange: (value: unknown) => void; placeholder?: string }) {
  const text = typeof value === 'string' ? value : value == null ? '' : String(value)
  return <Input value={text} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

function TypedValue({ meta, value, onChange, ctx, placeholder }: SubProps<'value'>) {
  const name = firstColumn(ctx.params[meta.like])
  const column = inputColumns(ctx.schema, undefined, ctx.inPorts).find((item) => item.name === name)
  const kind = valueKind(column?.group)

  if (kind === 'boolean') {
    return (
      <Select
        value={value === true ? 'true' : value === false ? 'false' : ''}
        options={[
          { value: 'true', label: 'True' },
          { value: 'false', label: 'False' },
        ]}
        onChange={(next) => onChange(next === 'true')}
        placeholder="Select…"
      />
    )
  }

  if (kind === 'number') {
    return <NumberField typeName="float" value={value} onChange={onChange} />
  }

  return <TextField value={value} onChange={onChange} placeholder={placeholder ?? column?.dtype ?? 'value'} />
}

function ResourceSelect({ value, onChange, ctx }: SubProps<'resource'>) {
  const { data, isLoading } = useResources(ctx.workspaceId)

  return (
    <Select
      value={typeof value === 'string' ? value : ''}
      options={(data?.keys ?? []).map((key) => ({ value: key, label: key, icon: <TableIcon /> }))}
      onChange={onChange}
      placeholder="Select a resource"
      emptyText="No datasets yet — import one from the Resources tab"
      loading={isLoading}
    />
  )
}

function MapEditor({ meta, value, onChange, ctx }: SubProps<'map'>) {
  const [rows, setRows] = useState<MapRow[]>(() => {
    const initial: MapRow[] = isRecord(value) ? Object.entries(value) : []
    const blank: MapRow[] = [['', undefined]]
    return initial.length > 0 ? initial : blank
  })

  function commit(next: MapRow[]) {
    const rest = next.length > 0 ? next : [['', undefined] as MapRow]
    setRows(rest)
    const filled = rest.filter(([key]) => key !== '')
    onChange(filled.length > 0 ? Object.fromEntries(filled) : undefined)
  }

  function update(index: number, key: string, entryValue: unknown) {
    const nextRow: MapRow = [key, entryValue]
    commit(rows.map((row, i): MapRow => (i === index ? nextRow : row)))
  }

  return (
    <div className="kv">
      {rows.map(([key, entryValue], index) => (
        <div className="kv-row" key={index}>
          <MetaControl
            meta={meta.key}
            typeName="str"
            value={key}
            onChange={(next) => update(index, next == null ? '' : String(next), entryValue)}
            ctx={ctx}
            exclude={new Set(rows.filter((_, i) => i !== index).map(([otherKey]) => otherKey))}
          />
          <MetaControl
            meta={meta.value}
            typeName="str"
            value={entryValue}
            onChange={(next) => update(index, key, next)}
            ctx={ctx}
          />
          <IconButton size="sm" flat tip="Remove" onClick={() => commit(rows.filter((_, i) => i !== index))}>
            <CloseIcon />
          </IconButton>
        </div>
      ))}
      <button type="button" className="cols-link kv-add" onClick={() => setRows([...rows, ['', undefined]])}>
        + Add row
      </button>
    </div>
  )
}

export function MetaControl({ meta, typeName, value, onChange, ctx, placeholder, exclude }: ControlProps) {
  switch (meta.kind) {
    case 'column':
      return <ColumnSelect meta={meta} value={value} onChange={onChange} ctx={ctx} placeholder={placeholder} exclude={exclude} />
    case 'columns':
      return <ColumnPicker meta={meta} value={value} onChange={onChange} ctx={ctx} />
    case 'enum':
      return <EnumSelect meta={meta} value={value} onChange={onChange} ctx={ctx} placeholder={placeholder} />
    case 'number':
      return <NumberField typeName={typeName} minimum={meta.min} value={value} onChange={onChange} />
    case 'text':
      return <TextField value={value} onChange={onChange} placeholder={placeholder} />
    case 'value':
      return <TypedValue meta={meta} value={value} onChange={onChange} ctx={ctx} placeholder={placeholder} />
    case 'resource':
      return <ResourceSelect meta={meta} value={value} onChange={onChange} ctx={ctx} />
    case 'map':
      return <MapEditor meta={meta} value={value} onChange={onChange} ctx={ctx} />
  }
}
