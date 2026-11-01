import { useMemo } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inferSchema, listNodes, registerNode, unregisterNode } from './api'
import { GraphSpec, RegisterNodePayload, SchemaSpec } from '../types'

export const nodeLibraryQueryKey = (workspaceId: string) => ['workspaces', workspaceId, 'nodes'] as const

export function useNodeLibrary(workspaceId: string) {
  return useQuery({
    queryKey: nodeLibraryQueryKey(workspaceId),
    queryFn: () => listNodes(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

function toSchemaSpec(spec: GraphSpec): SchemaSpec {
  return {
    nodes: spec.nodes.map(({ id, type, name, params }) => ({ id, type, name, params })),
    connections: spec.connections,
  }
}

export function useGraphSchema(workspaceId: string, spec: GraphSpec | null) {
  const payload = useMemo(() => (spec ? toSchemaSpec(spec) : null), [spec])
  const serialized = useMemo(() => JSON.stringify(payload), [payload])

  return useQuery({
    queryKey: [...nodeLibraryQueryKey(workspaceId), 'schema', serialized] as const,
    queryFn: () => inferSchema(workspaceId, payload as SchemaSpec),
    enabled: Boolean(workspaceId && payload && payload.nodes.length > 0),
    placeholderData: keepPreviousData,
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