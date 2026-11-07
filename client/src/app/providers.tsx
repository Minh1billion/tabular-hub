import { PropsWithChildren } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/lib/query-client'
import { LoginModalProvider } from '@/modules/auth/components/LoginModal'

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <LoginModalProvider>{children}</LoginModalProvider>
    </QueryClientProvider>
  )
}
