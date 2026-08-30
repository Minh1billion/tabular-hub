import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listNodes, registerNode, unregisterNode } from './api'
import { RegisterNodePayload } from '../types'

export const nodeLibraryQueryKey = (workspaceId: string) => ['workspaces', workspaceId, 'nodes'] as const

export function useNodeLibrary(workspaceId: string) {
  return useQuery({
    queryKey: nodeLibraryQueryKey(workspaceId),
    queryFn: () => listNodes(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useRegisterNode(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegisterNodePayload) => registerNode(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nodeLibraryQueryKey(workspaceId) })
    },
  })
}

export function useUnregisterNode(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => unregisterNode(workspaceId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nodeLibraryQueryKey(workspaceId) })
    },
  })
}