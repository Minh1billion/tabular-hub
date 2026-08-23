import { apiClient } from '@/shared/lib/api-client'
import { CreateWorkspacePayload, UpdateWorkspacePayload, Workspace } from './types'

export function listWorkspaces() {
  return apiClient.get<Workspace[]>('/workspaces')
}

export function getWorkspace(workspaceId: string) {
  return apiClient.get<Workspace>(`/workspaces/${workspaceId}`)
}

export function createWorkspace(payload: CreateWorkspacePayload) {
  return apiClient.post<Workspace>('/workspaces', payload)
}

export function updateWorkspace(workspaceId: string, payload: UpdateWorkspacePayload) {
  return apiClient.patch<Workspace>(`/workspaces/${workspaceId}`, payload)
}

export function deleteWorkspace(workspaceId: string) {
  return apiClient.delete<void>(`/workspaces/${workspaceId}`)
}