import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from './components/AppHeader'
import { TopbarSlotContext } from './TopbarSlot'
import { AuthGuard } from '@/modules/auth/components/AuthGuard'

export function AppLayout() {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  return (
    <AuthGuard>
      <TopbarSlotContext.Provider value={slot}>
        <div className="app">
          <AppHeader slotRef={setSlot} />
          <div className="app-body">
            <Outlet />
          </div>
        </div>
      </TopbarSlotContext.Provider>
    </AuthGuard>
  )
}
