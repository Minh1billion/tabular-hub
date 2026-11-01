import { NodeSchema, SchemaColumn } from '../../types'

export type ValueKind = 'number' | 'boolean' | 'text'

export function hasSchema(schema: NodeSchema | undefined): boolean {
  return Boolean(schema && Object.keys(schema.inputs).length > 0)
}

export function inputColumns(
  schema: NodeSchema | undefined,
  scope: string | undefined,
  inPorts: string[] | null | undefined,
): SchemaColumn[] {
  if (!schema) return []
  const slots = Object.values(schema.inputs)
  if (slots.length === 0) return []
  if (inPorts && slots.length < inPorts.length) return []

  if (scope === 'common') {
    const [first, ...rest] = slots
    return first.filter((column) => rest.every((slot) => slot.some((other) => other.name === column.name)))
  }

  const seen = new Set<string>()
  const merged: SchemaColumn[] = []
  for (const slot of slots) {
    for (const column of slot) {
      if (seen.has(column.name)) continue
      seen.add(column.name)
      merged.push(column)
    }
  }
  return merged
}

export function matchesDtype(column: SchemaColumn, dtype: string | undefined): boolean {
  return !dtype || column.group === dtype
}

export function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function firstColumn(value: unknown): string {
  if (typeof value === 'string') return value
  return asStringList(value)[0] ?? ''
}

export function valueKind(group: string | undefined): ValueKind {
  if (group === 'numeric') return 'number'
  if (group === 'boolean') return 'boolean'
  return 'text'
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function numberError(text: string, typeName: string, minimum: number | undefined): string | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const pattern = typeName === 'int' ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/
  if (!pattern.test(trimmed)) return typeName === 'int' ? 'Must be an integer' : 'Must be a number'
  if (minimum !== undefined && Number(trimmed) < minimum) return `Must be at least ${minimum}`
  return null
}

export function parseNumber(text: string, typeName: string): number | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  return typeName === 'int' ? parseInt(trimmed, 10) : parseFloat(trimmed)
}

export function emptyColumnsText(schema: NodeSchema | undefined, dtype: string | undefined): string {
  if (!hasSchema(schema)) return 'Connect an upstream node first'
  return dtype ? `No ${dtype} columns in the input` : 'No columns in the input'
}
