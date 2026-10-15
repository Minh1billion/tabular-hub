import { useMutation, useQuery } from '@tanstack/react-query'
import { createCheckoutSession, createPortalSession, getPlans, getSubscription } from './api'

export const subscriptionQueryKey = ['billing', 'subscription'] as const
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