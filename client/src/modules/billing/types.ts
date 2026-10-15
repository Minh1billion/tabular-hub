export type PlanTier = 'free' | 'pro' | 'team'

export interface Plan {
  tier: PlanTier
  label: string
  price_cents: number
  currency: string
  interval: string | null
  max_workspaces: number
  max_resource_size_bytes: number
  max_total_storage_bytes: number
}

export interface Subscription {
  tier: PlanTier
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  max_workspaces: number
  workspace_count: number
  max_resource_size_bytes: number
  max_total_storage_bytes: number
  storage_used_bytes: number
}