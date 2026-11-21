export interface NodePosition {
  x: number
  y: number
}

export interface GraphNode {
  id: string
  type: string
  name: string
  params: Record<string, unknown>
  position: NodePosition
}

export interface GraphConnection {
  from: string
  to: string
  on?: string
  into?: string
}

export interface GraphSpec {
  name: string
  nodes: GraphNode[]
  connections: GraphConnection[]
  [key: string]: unknown
}

export interface SchemaColumn {
  name: string
  dtype: string
  group: string
}

export interface NodeSchema {
  inputs: Record<string, SchemaColumn[]>
  output: SchemaColumn[] | null
}

export interface SchemaResponse {
  nodes: Record<string, NodeSchema>
  error: string | null
}

export interface SchemaSpec {
  nodes: Array<Pick<GraphNode, 'id' | 'type' | 'name' | 'params'>>
  connections: GraphConnection[]
}

export type ParamMeta =
  | { kind: 'column'; dtype?: string; scope?: string }
  | { kind: 'columns'; dtype?: string; scope?: string }
  | { kind: 'enum'; options: string[] }
  | { kind: 'number'; min?: number }
  | { kind: 'text' }
  | { kind: 'map'; key: ParamMeta; value: ParamMeta }
  | { kind: 'value'; like: string }
  | { kind: 'resource' }

export interface NodeDescriptor {
  type: string
  required: Record<string, string>
  optional: Record<string, string>
  param_meta?: Record<string, ParamMeta>
  ports_out: string[]
  fan_in: boolean
  in_ports: string[] | null
}

export interface NodeLibrary {
  builtin: NodeDescriptor[]
  custom: NodeDescriptor[]
}

export interface RegisterNodePayload {
  name: string
  expression: string
  description?: string
}
