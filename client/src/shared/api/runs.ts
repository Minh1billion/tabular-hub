import { apiClient } from '@/shared/lib/api-client'
import { Run, RunEvent } from '@/shared/types/run'

export interface NodeError {
  node_id: string | null
  node_type: string | null
  message: string
}

export interface ValidateResponse {
  valid: boolean
  errors: NodeError[]
}

export function getRun(workspaceId: string, runId: string) {
  return apiClient.get<Run>(`/workspaces/${workspaceId}/runs/${runId}`)
}

export function listRuns(workspaceId: string, limit: number, offset: number) {
  return apiClient.get<Run[]>(`/workspaces/${workspaceId}/runs?limit=${limit}&offset=${offset}`)
}

export function getRunEventHistory(workspaceId: string, runId: string) {
  return apiClient.get<RunEvent[]>(`/workspaces/${workspaceId}/runs/${runId}/events/history`)
}

export function validateSpec(workspaceId: string, spec: Record<string, unknown>) {
  return apiClient.post<ValidateResponse>(`/workspaces/${workspaceId}/runs/validate`, { spec })
}

export function createRun(workspaceId: string, spec: Record<string, unknown>, idempotencyKey: string) {
  return apiClient.post<Run>(`/workspaces/${workspaceId}/runs`, { spec, idempotency_key: idempotencyKey })
}

export function cancelRun(workspaceId: string, runId: string) {
  return apiClient.post<Run>(`/workspaces/${workspaceId}/runs/${runId}/cancel`)
}