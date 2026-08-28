import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/shared/lib/api-client'
import { RunStreamEvent, TERMINAL_RUN_EVENTS } from '@/shared/types/run'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export function useRunEvents(workspaceId: string | undefined, runId: string | undefined) {
  const [events, setEvents] = useState<RunStreamEvent[]>([])
  const sourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    setEvents([])

    if (!workspaceId || !runId) return

    let cancelled = false

    async function start() {
      const history = await apiClient
        .get<{ data: RunStreamEvent }[]>(`/workspaces/${workspaceId}/runs/${runId}/events/history`)
        .catch(() => [])
      if (cancelled) return

      const historyEvents = history.map((item) => item.data)
      setEvents(historyEvents)

      const alreadyDone = historyEvents.some((event) =>
        TERMINAL_RUN_EVENTS.includes(event.event as (typeof TERMINAL_RUN_EVENTS)[number]),
      )
      if (alreadyDone) return

      const source = new EventSource(`${API_URL}/workspaces/${workspaceId}/runs/${runId}/events`, {
        withCredentials: true,
      })
      sourceRef.current = source

      source.onmessage = (message) => {
        const parsed = JSON.parse(message.data) as RunStreamEvent
        setEvents((prev) => [...prev, parsed])
        if (TERMINAL_RUN_EVENTS.includes(parsed.event as (typeof TERMINAL_RUN_EVENTS)[number])) {
          source.close()
        }
      }

      source.onerror = () => {
        source.close()
      }
    }

    start()

    return () => {
      cancelled = true
      sourceRef.current?.close()
      sourceRef.current = null
    }
  }, [workspaceId, runId])

  const latestEvent = events[events.length - 1]
  const isDone = latestEvent ? TERMINAL_RUN_EVENTS.includes(latestEvent.event as (typeof TERMINAL_RUN_EVENTS)[number]) : false

  return { events, latestEvent, isDone }
}