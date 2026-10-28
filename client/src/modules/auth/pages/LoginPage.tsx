import logo from '@/assets/logo.svg'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { NodeOverlay } from '@/shared/components/ui/NodeOverlay'
import { OAuthButton } from '../components/OAuthButton'

export function LoginPage() {
  return (
    <div className="auth">
      <GridPattern />
      <NodeOverlay />

      <div className="auth-brand brand">
        <img src={logo} alt="" />
        <span>
          Tabular<b>Hub</b>
        </span>
      </div>

      <div className="auth-card">
        <div className="kicker mb-3">Sign in</div>
        <h1 className="m-0 mb-2 text-[24px] font-bold tracking-tight">Connect your workspace</h1>
        <p className="m-0 mb-7 text-[14px] text-slate leading-relaxed">Sign in with an existing account to continue.</p>

        <div className="oauth-stack flex flex-col gap-3">
          <OAuthButton provider="google" />
          <OAuthButton provider="github" />
        </div>

        <p className="mt-6 mb-0 text-[12px] text-muted leading-relaxed">
          By continuing, you agree to the{' '}
          <a href="#" className="text-slate underline underline-offset-2">
            terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-slate underline underline-offset-2">
            privacy policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
