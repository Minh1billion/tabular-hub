import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteResource, exportDownloadUrl, exportResource, importResource, listResources, previewResource } from './api'
import { ExportResourcePayload, ImportResourcePayload } from './types'
import { workspacesQueryKey } from '@/modules/workspace/hooks'

export const resourcesQueryKey = (workspaceId: string) => ['workspaces', workspaceId, 'resources'] as const
export const resourcePreviewQueryKey = (workspaceId: string, key: string, limit: number, offset: number) =>
  ['workspaces', workspaceId, 'resources', key, limit, offset] as const

export function useResources(workspaceId: string) {
  return useQuery({
    queryKey: resourcesQueryKey(workspaceId),
    queryFn: () => listResources(workspaceId),
    enabled: Boolean(workspaceId),
  })
}

export function useResourcePreview(workspaceId: string, key: string, limit: number, offset: number) {
  return useQuery({
    queryKey: resourcePreviewQueryKey(workspaceId, key, limit, offset),
    queryFn: () => previewResource(workspaceId, key, limit, offset),
    enabled: Boolean(workspaceId) && Boolean(key),
  })
}

export function useImportResource(workspaceId: string) {
  const [progress, setProgress] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: ImportResourcePayload) => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller
      setProgress(0)
      return importResource(workspaceId, payload, setProgress, controller.signal)
    },
  })

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    mutation.reset()
    setProgress(0)
  }, [mutation])

  return { ...mutation, progress, abort }
}

export function useDeleteResource(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (key: string) => deleteResource(workspaceId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })
}

export function useExportResource(workspaceId: string, key: string) {
  return useMutation({
    mutationFn: (payload: ExportResourcePayload) => exportResource(workspaceId, key, payload),
  })
}

export function useExportDownloadUrl(
  workspaceId: string,
  key: string,
  runId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['workspaces', workspaceId, 'resources', key, 'export', runId, 'download'] as const,
    queryFn: () => exportDownloadUrl(workspaceId, key, runId!),
    enabled: Boolean(workspaceId) && Boolean(key) && Boolean(runId) && enabled,
    refetchOnWindowFocus: false,
  })
}