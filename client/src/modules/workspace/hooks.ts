import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  inviteMember,
  listMembers,
  listWorkspaces,
  removeMember,
  revokeInvitation,
  updateWorkspace,
} from './api'
import { UpdateWorkspacePayload } from './types'
import { touchWorkspace } from './lib/activity'
import { subscriptionQueryKey } from '@/modules/billing/hooks'

export const workspacesQueryKey = ['workspaces'] as const
export const workspaceQueryKey = (id: string) => ['workspaces', id] as const
export const workspaceMembersQueryKey = (id: string) => ['workspaces', id, 'members'] as const

export function useWorkspaces() {
  return useQuery({
    queryKey: workspacesQueryKey,
    queryFn: listWorkspaces,
  })
}

export function useWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: workspaceQueryKey(workspaceId),
    queryFn: async () => {
      const workspace = await getWorkspace(workspaceId)
      touchWorkspace(workspaceId)
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
      return workspace
    },
    enabled: Boolean(workspaceId),
    refetchOnWindowFocus: true,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })
    },
  })
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => updateWorkspace(workspaceId, payload),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceQueryKey(workspaceId), workspace)
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })
}

export function useRenameWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateWorkspace(id, { name }),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceQueryKey(workspace.id), workspace)
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })
    },
  })
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceMembersQueryKey(workspaceId),
    queryFn: () => listMembers(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 0,
  })
}

export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) => inviteMember(workspaceId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMembersQueryKey(workspaceId) })
    },
  })
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMembersQueryKey(workspaceId) })
    },
  })
}

export function useRevokeInvitation(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(workspaceId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMembersQueryKey(workspaceId) })
    },
  })
}