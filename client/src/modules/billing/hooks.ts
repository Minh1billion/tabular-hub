import { useMutation, useQuery } from '@tanstack/react-query'
import { createCheckoutSession, createPortalSession, getPlans, getSubscription, getWorkspaceSubscription } from './api'

export const subscriptionQueryKey = ['billing', 'subscription'] as const
export const workspaceSubscriptionQueryKey = (workspaceId: string) => ['billing', 'subscription', 'workspace', workspaceId] as const
export const plansQueryKey = ['billing', 'plans'] as const

export function usePlans() {
  return useQuery({
    queryKey: plansQueryKey,
    queryFn: getPlans,
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: subscriptionQueryKey,
    queryFn: getSubscription,
  })
}

export function useWorkspaceSubscription(workspaceId: string | undefined) {
  return useQuery({
    queryKey: workspaceSubscriptionQueryKey(workspaceId ?? ''),
    queryFn: () => getWorkspaceSubscription(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
  })
}

export function useCheckout() {
  return useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}

export function usePortal() {
  return useMutation({
    mutationFn: createPortalSession,
    onSuccess: ({ url }) => {
      window.location.href = url
    },
  })
}