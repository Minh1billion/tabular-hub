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