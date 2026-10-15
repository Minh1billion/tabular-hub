import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelRun, createRun, getRun, listRuns, validateSpec } from './api'

export function useValidateSpec(workspaceId: string) {
  return useMutation({
    mutationFn: (spec: Record<string, unknown>) => validateSpec(workspaceId, spec),
  })
}

export function useRuns(workspaceId: string, limit: number, offset: number) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'runs', limit, offset],
    queryFn: () => listRuns(workspaceId, limit, offset),
    enabled: Boolean(workspaceId),
    placeholderData: (previous) => previous,
  })
}

export function useRun(workspaceId: string, runId: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'runs', runId],
    queryFn: () => getRun(workspaceId, runId as string),
    enabled: Boolean(workspaceId && runId),
    retry: false,
  })
}

export function useCreateRun(workspaceId: string) {
  return useMutation({
    mutationFn: (spec: Record<string, unknown>) => createRun(workspaceId, spec, crypto.randomUUID()),
  })
}

export function useCancelRun(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (runId: string) => cancelRun(workspaceId, runId),
    onSuccess: (run) => {
      queryClient.setQueryData(['workspaces', workspaceId, 'runs', run.id, 'status'], run)
    },
  })
}