import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { workspacesQueryKey } from '@/modules/workspace/hooks'
import { ApiError } from './api-client'

function isAccessDenied(error: unknown) {
  return error instanceof ApiError && error.status === 403
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isAccessDenied(error) && query.queryKey[0] !== workspacesQueryKey[0]) {
        queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isAccessDenied(error)) {
        queryClient.invalidateQueries({ queryKey: workspacesQueryKey })
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return false
        }
        return failureCount < 2
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
