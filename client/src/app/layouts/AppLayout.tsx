import { Outlet } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { AppSidebar } from './components/AppSidebar'
import { AppFooter } from './components/AppFooter'
import { AuthGuard } from '@/modules/auth/components/AuthGuard'

export function AppLayout() {
  return (
    <AuthGuard>
      <div className="h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex min-h-0">
          <AppSidebar />
          <div className="flex-1 min-h-0 overflow-auto">
            <Outlet />
          </div>
        </div>
        <AppFooter />
      </div>
    </AuthGuard>
  )
}