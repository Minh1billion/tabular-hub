import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelRun, createRun, validateSpec } from '@/shared/api/runs'

export function useValidateSpec(workspaceId: string) {
  return useMutation({
    mutationFn: (spec: Record<string, unknown>) => validateSpec(workspaceId, spec),
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