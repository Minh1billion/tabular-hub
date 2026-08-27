import { apiClient } from '@/shared/lib/api-client'
import { Run } from '@/shared/types/run'
import { ImportResourcePayload, ResourceListResponse, ResourcePreview } from './types'

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

export function importResource(workspaceId: string, payload: ImportResourcePayload) {
  const formData = new FormData()
  formData.append('key', payload.key)
  formData.append('format', payload.format)
  formData.append('overwrite', String(payload.overwrite))
  formData.append('idempotency_key', crypto.randomUUID())
  formData.append('file', payload.file)

  return apiClient.upload<Run>(`/workspaces/${workspaceId}/resources`, formData)
}
