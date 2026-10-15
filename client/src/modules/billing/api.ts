import { apiClient } from '@/shared/lib/api-client'
import { Plan, PlanTier, Subscription } from './types'

export function getPlans() {
  return apiClient.get<Plan[]>('/billing/plans')
}

export function getSubscription() {
  return apiClient.get<Subscription>('/billing/subscription')
}

export function createCheckoutSession(tier: PlanTier) {
  return apiClient.post<{ url: string }>('/billing/checkout-session', { tier })
}

export function createPortalSession() {
  return apiClient.post<{ url: string }>('/billing/portal-session')
}