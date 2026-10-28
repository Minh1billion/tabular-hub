import { Outlet } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { AppSidebar, MobileNav } from './components/AppSidebar'
import { AuthGuard } from '@/modules/auth/components/AuthGuard'
import { useSidebarCollapsed } from '@/shared/hooks/useSidebarCollapsed'
import { cn } from '@/shared/lib/cn'

export function AppLayout() {
  const { collapsed, toggle } = useSidebarCollapsed()

  return (
    <AuthGuard>
      <div className={cn('shell', collapsed && 'collapsed')}>
        <AppSidebar collapsed={collapsed} onToggle={toggle} />
        <div className="main">
          <AppHeader />
          <div className="main-body">
            <Outlet />
          </div>
        </div>
        <MobileNav />
      </div>
    </AuthGuard>
  )
}
