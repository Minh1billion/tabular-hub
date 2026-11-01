import { apiClient } from '@/shared/lib/api-client'
import { NodeLibrary, RegisterNodePayload, SchemaResponse, SchemaSpec } from '../types'

export function listNodes(workspaceId: string) {
  return apiClient.get<NodeLibrary>(`/workspaces/${workspaceId}/nodes`)
}

export function inferSchema(workspaceId: string, spec: SchemaSpec) {
  return apiClient.post<SchemaResponse>(`/workspaces/${workspaceId}/runs/schema`, { spec })
}

export function registerNode(workspaceId: string, payload: RegisterNodePayload) {
  return apiClient.post(`/workspaces/${workspaceId}/nodes`, payload)
}

export function unregisterNode(workspaceId: string, name: string) {
  return apiClient.delete<void>(`/workspaces/${workspaceId}/nodes/${name}`)
}