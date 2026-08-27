import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { WorkspaceListPage } from '@/modules/workspace/pages/WorkspaceListPage'
import { EditorPage } from '@/modules/editor/pages/EditorPage'
import { ResourceListPage } from '@/modules/resources/pages/ResourceListPage'
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
      { path: '/workspaces/:id/resources', element: <ResourceListPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/workspaces" replace /> },
])