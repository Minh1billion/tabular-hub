import { createBrowserRouter, useParams } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { EditorPage } from '@/modules/editor/pages/EditorPage'
import { BillingPage } from '@/modules/billing/pages/BillingPage'
import { HomePage } from './pages/HomePage'
import { AppIndexPage } from './pages/AppIndexPage'
import { NotFoundPage } from './pages/NotFoundPage'

function EditorRoute() {
  const { id } = useParams<{ id: string }>()
  return <EditorPage key={id} />
}

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/app', element: <AppIndexPage /> },
      { path: '/app/:id', element: <EditorRoute /> },
      { path: '/billing', element: <BillingPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
