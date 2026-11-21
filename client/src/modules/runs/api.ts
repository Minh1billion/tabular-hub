import { apiClient } from '@/shared/lib/api-client'
import { NodeError, Run, RunEvent, ValidateResponse } from './types'

export type { NodeError, ValidateResponse }

export function getRun(workspaceId: string, runId: string) {
  return apiClient.get<Run>(`/workspaces/${workspaceId}/runs/${runId}`)
}

export interface ListRunsOptions {
  limit?: number
  offset?: number
  status?: string
  kind?: string
}

export function listRuns(
  workspaceId: string,
  optionsOrLimit: number | ListRunsOptions = 20,
  offsetArg: number = 0,
  statusArg?: string,
  kindArg?: string,
) {
  const options =
    typeof optionsOrLimit === 'object'
      ? optionsOrLimit
      : { limit: optionsOrLimit, offset: offsetArg, status: statusArg, kind: kindArg }

  const params = new URLSearchParams()
  if (options.limit != null) params.set('limit', String(options.limit))
  if (options.offset != null) params.set('offset', String(options.offset))
  if (options.status) params.set('status', options.status)
  if (options.kind) params.set('kind', options.kind)

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiClient.get<Run[]>(`/workspaces/${workspaceId}/runs${query}`)
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