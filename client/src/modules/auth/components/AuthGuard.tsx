import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '../hooks'

export function AuthGuard({ children }: PropsWithChildren) {
  const { data: user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="splash">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
