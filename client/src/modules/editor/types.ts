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