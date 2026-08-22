import { apiClient } from '@/shared/lib/api-client'
import { User } from './types'

export function getMe() {
  return apiClient.get<User>('/auth/me')
}

export function logout() {
  return apiClient.post<void>('/auth/logout')
}
