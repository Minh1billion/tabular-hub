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

export interface NodeDescriptor {
  type: string
  required: Record<string, string>
  optional: Record<string, string>
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
