import { apiClient } from '@/shared/lib/api-client'
import { Run, RunEvent } from '@/shared/types/run'

export function getRun(workspaceId: string, runId: string) {
  return apiClient.get<Run>(`/workspaces/${workspaceId}/runs/${runId}`)
}

export function getRunEventHistory(workspaceId: string, runId: string) {
  return apiClient.get<RunEvent[]>(`/workspaces/${workspaceId}/runs/${runId}/events/history`)
}