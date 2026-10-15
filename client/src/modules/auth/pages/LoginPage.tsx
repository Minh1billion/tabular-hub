import logo from '@/assets/logo.svg'
import { GridPattern } from '@/shared/components/ui/GridPattern'
import { NodeOverlay } from '@/shared/components/ui/NodeOverlay'
import { OAuthButton } from '../components/OAuthButton'

export function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <GridPattern />
      <NodeOverlay />

      <div className="absolute top-9 left-1/2 -translate-x-1/2 flex items-center gap-[9px] z-10">
        <img src={logo} alt="Tabular Manner" className="w-8 h-8" />
        <span className="font-headline font-semibold text-[15px]">Tabular Manner</span>
      </div>

      <div className="relative z-10 w-full max-w-[380px] bg-white border-2 border-black rounded-panel px-9 py-10 text-center">
        <div className="font-mono text-[11.5px] text-muted tracking-wide mb-3.5">SIGN IN</div>
        <h1 className="font-headline font-semibold text-2xl mb-2">Connect your workspace</h1>
        <p className="text-sm text-slate leading-relaxed mb-[30px]">
          Sign in with an existing account to continue.
        </p>

        <div className="flex flex-col gap-2.5">
          <OAuthButton provider="google" />
          <OAuthButton provider="github" />
        </div>

        <p className="mt-6 text-xs text-muted leading-relaxed">
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