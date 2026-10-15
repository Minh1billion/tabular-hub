import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRun } from './api'
import { Run, TERMINAL_RUN_EVENTS } from './types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function isTerminal(status: string | undefined) {
  return Boolean(status) && TERMINAL_RUN_EVENTS.includes(status as (typeof TERMINAL_RUN_EVENTS)[number])
}

export function useRunTracking(workspaceId: string | undefined, runId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['workspaces', workspaceId, 'runs', runId, 'status'] as const

  const query = useQuery({
    queryKey,
    queryFn: () => getRun(workspaceId!, runId!),
    enabled: Boolean(workspaceId) && Boolean(runId),
    refetchOnWindowFocus: false,
  })

  const status = query.data?.status

  useEffect(() => {
    if (!workspaceId || !runId) return
    if (isTerminal(status)) return

    const source = new EventSource(`${API_URL}/workspaces/${workspaceId}/runs/${runId}/events`, {
      withCredentials: true,
    })

    source.onmessage = (message) => {
      const parsed = JSON.parse(message.data) as { event: string }
      if (isTerminal(parsed.event)) {
        queryClient.setQueryData<Run>(queryKey, (prev) => (prev ? { ...prev, status: parsed.event } : prev))
        source.close()
      }
    }

    source.onerror = () => {
      source.close()
      queryClient.invalidateQueries({ queryKey })
    }

    return () => source.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, runId, status])

  return query
}