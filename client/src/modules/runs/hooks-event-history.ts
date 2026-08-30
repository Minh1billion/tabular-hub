import { useQuery } from '@tanstack/react-query'
import { getRunEventHistory } from './api'

export function useRunEventHistory(workspaceId: string | undefined, runId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'runs', runId, 'history'],
    queryFn: () => getRunEventHistory(workspaceId!, runId!),
    enabled: Boolean(workspaceId) && Boolean(runId) && enabled,
  })
}