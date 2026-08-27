import { apiClient } from '@/shared/lib/api-client'
import { NodeLibrary, RegisterNodePayload } from './types'

export function listNodes(workspaceId: string) {
  return apiClient.get<NodeLibrary>(`/workspaces/${workspaceId}/nodes`)
}

export function registerNode(workspaceId: string, payload: RegisterNodePayload) {
  return apiClient.post(`/workspaces/${workspaceId}/nodes`, payload)
}

export function unregisterNode(workspaceId: string, name: string) {
  return apiClient.delete<void>(`/workspaces/${workspaceId}/nodes/${name}`)
}