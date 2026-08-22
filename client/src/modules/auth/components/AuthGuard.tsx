import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '../hooks'

export function AuthGuard({ children }: PropsWithChildren) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <span className="font-mono text-xs text-muted">Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
