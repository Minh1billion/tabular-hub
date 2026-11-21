import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { OAuthButton } from './OAuthButton'

interface LoginModalApi {
  open: () => void
  close: () => void
}

const LoginModalContext = createContext<LoginModalApi | null>(null)

export function useLoginModal(): LoginModalApi {
  const ctx = useContext(LoginModalContext)
  if (!ctx) throw new Error('useLoginModal must be used inside <LoginModalProvider>')
  return ctx
}

export function LoginModalProvider({ children }: PropsWithChildren) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const api = useMemo(() => ({ open, close }), [open, close])

  return (
    <LoginModalContext.Provider value={api}>
      {children}
      {isOpen && <LoginModal onClose={close} />}
    </LoginModalContext.Provider>
  )
}

function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Sign in to Tabular Hub" onClose={onClose} className="login-modal">
      <p className="login-lead">Sign in with an existing account to open your workspace.</p>

      <div className="oauth-stack">
        <OAuthButton provider="google" />
        <OAuthButton provider="github" />
      </div>

      <p className="login-terms">
        By continuing, you agree to the <a href="#">terms</a> and <a href="#">privacy policy</a>.
      </p>
    </Modal>
  )
}
