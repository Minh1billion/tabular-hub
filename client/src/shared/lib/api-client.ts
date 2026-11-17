const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_STORAGE_KEY = 'tabular_hub_access_token'

function consumeHashToken(): void {
  if (typeof window === 'undefined') return
  const hash = window.location.hash
  if (!hash.startsWith('#token=')) return
  const token = decodeURIComponent(hash.slice('#token='.length))
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

consumeHashToken()

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export class ApiError extends Error {
  status: number
  data: Record<string, unknown> | null

  constructor(status: number, message: string, data: Record<string, unknown> | null = null) {
    super(message)
    this.status = status
    this.data = data
  }

  get code(): string | null {
    return typeof this.data?.code === 'string' ? this.data.code : null
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (path === '/auth/logout' && response.ok) {
    clearAuthToken()
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, data?.detail ?? 'Something went wrong', data)
  }

  return data as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function wsUrl(path: string) {
  return `${API_URL.replace(/^http/, 'ws')}${path}`
}

export function oauthLoginUrl(provider: 'google' | 'github') {
  return `${API_URL}/auth/${provider}/login`
}