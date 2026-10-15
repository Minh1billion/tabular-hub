export interface Run {
  id: string
  workspace_id: string
  kind: string
  status: string
  execution_id: string | null
  attempt: number
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface RunEvent {
  attempt: number
  seq: number
  event: string
  data: Record<string, unknown> | null
  ts: string
}

export interface RunStreamEvent {
  event: string
  ts: string
  data?: Record<string, unknown>
  error?: string
  [key: string]: unknown
}

export const TERMINAL_RUN_EVENTS = ['completed', 'failed', 'cancelled'] as const
export interface NodeError {
  node_id: string | null
  node_type: string | null
  message: string
}

export interface ValidateResponse {
  valid: boolean
  errors: NodeError[]
}
