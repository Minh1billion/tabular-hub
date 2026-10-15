import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cancelRun, createRun, getRun, listRuns, validateSpec } from './api'
import { Run } from './types'

export function useValidateSpec(workspaceId: string) {
  return useMutation({
    mutationFn: (spec: Record<string, unknown>) => validateSpec(workspaceId, spec),
  })
}

export interface UseRunsParams {
  limit?: number
  offset?: number
  status?: string
  kind?: string
}

export function useRuns(
  workspaceId: string,
  paramsOrLimit: UseRunsParams | number = 20,
  offsetArg: number = 0,
  statusArg?: string,
  kindArg?: string,
) {
  const params: UseRunsParams =
    typeof paramsOrLimit === 'object'
      ? paramsOrLimit
      : { limit: paramsOrLimit, offset: offsetArg, status: statusArg, kind: kindArg }

  const { limit = 20, offset = 0, status, kind } = params

  return useQuery({
    queryKey: ['workspaces', workspaceId, 'runs', { limit, offset, status, kind }],
    queryFn: () => listRuns(workspaceId, { limit, offset, status, kind }),
    enabled: Boolean(workspaceId),
    placeholderData: (previous) => previous,
    refetchInterval: (query) => {
      const data = query.state.data as Run[] | undefined
      const hasActive = data?.some((r) => ['queued', 'running', 'cancelling'].includes(r.status))
      return hasActive ? 2000 : 5000
    },
  })
}

export function useRun(workspaceId: string, runId: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'runs', runId],
    queryFn: () => getRun(workspaceId, runId as string),
    enabled: Boolean(workspaceId && runId),
    retry: false,
    refetchInterval: (query) => {
      const run = query.state.data as Run | undefined
      const isRunning = run && ['queued', 'running', 'cancelling'].includes(run.status)
      return isRunning ? 2000 : false
    },
  })
}

export function useCreateRun(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (spec: Record<string, unknown>) => createRun(workspaceId, spec, crypto.randomUUID()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'runs'] })
    },
  })
}

export function useCancelRun(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (runId: string) => cancelRun(workspaceId, runId),
    onSuccess: (run) => {
      queryClient.setQueryData(['workspaces', workspaceId, 'runs', run.id], run)
      queryClient.setQueryData(['workspaces', workspaceId, 'runs', run.id, 'status'], run)
      queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'runs'] })
    },
  })
}