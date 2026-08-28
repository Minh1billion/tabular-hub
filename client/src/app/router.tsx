import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { WorkspaceListPage } from '@/modules/workspace/pages/WorkspaceListPage'
import { EditorPage } from '@/modules/editor/pages/EditorPage'
import { RunHistoryPage } from '@/modules/runs/pages/RunHistoryPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/workspaces', element: <WorkspaceListPage /> },
      { path: '/workspaces/:id', element: <EditorPage /> },
      { path: '/workspaces/:workspaceId/runs', element: <RunHistoryPage /> },
      { path: '/workspaces/:workspaceId/runs/:runId', element: <RunHistoryPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/workspaces" replace /> },
])