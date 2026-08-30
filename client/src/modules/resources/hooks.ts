import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteResource, importResource, listResources, previewResource } from './api'
import { ImportResourcePayload } from './types'

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

  const mutation = useMutation({
    mutationFn: (payload: ImportResourcePayload) => {
      setProgress(0)
      return importResource(workspaceId, payload, setProgress)
    },
  })

  return { ...mutation, progress }
}

export function useDeleteResource(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (key: string) => deleteResource(workspaceId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey(workspaceId) })
    },
  })
}