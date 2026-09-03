import { apiClient } from '@/shared/lib/api-client'
import { Run } from '@/modules/runs/types'
import { ExportResourcePayload, ImportResourcePayload, ResourceListResponse, ResourcePreview } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export function listResources(workspaceId: string) {
  return apiClient.get<ResourceListResponse>(`/workspaces/${workspaceId}/resources`)
}

export function previewResource(workspaceId: string, key: string, limit: number, offset: number) {
  return apiClient.get<ResourcePreview>(
    `/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}?limit=${limit}&offset=${offset}`,
  )
}

export function deleteResource(workspaceId: string, key: string) {
  return apiClient.delete<void>(`/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}`)
}

export function importResource(
  workspaceId: string,
  payload: ImportResourcePayload,
  onProgress?: (percent: number) => void,
) {
  const formData = new FormData()
  formData.append('key', payload.key)
  formData.append('format', payload.format)
  formData.append('overwrite', String(payload.overwrite))
  formData.append('idempotency_key', crypto.randomUUID())
  formData.append('file', payload.file)

  return apiClient.upload<Run>(`/workspaces/${workspaceId}/resources`, formData, onProgress)
}

export function exportResource(workspaceId: string, key: string, payload: ExportResourcePayload) {
  return apiClient.post<Run>(`/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}/export`, {
    format: payload.format,
    idempotency_key: crypto.randomUUID(),
  })
}

export function exportDownloadUrl(workspaceId: string, key: string, runId: string) {
  return `${API_URL}/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}/export/${runId}/download`
}