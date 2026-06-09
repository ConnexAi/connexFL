'use client'

import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  async function handleGoogleLogin() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard`,
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm px-8 py-10 space-y-7">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[5px] bg-terracotta flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white tracking-tight leading-none">CX</span>
          </div>
          <span className="text-[14px] font-semibold text-ink tracking-tight">Connex</span>
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h1 className="text-[22px] font-semibold text-ink tracking-tight text-balance">
            Accede a tu cuenta
          </h1>
          <p className="text-[13px] text-ink-2 leading-relaxed">
            Inteligencia artificial para licitaciones del SECOP&nbsp;II.
          </p>
        </div>

        {/* Google sign-in */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-[10px] rounded-md border border-border text-[13px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <p className="text-[11px] text-ink-3 text-center leading-relaxed">
          Al continuar aceptas los términos de uso del servicio.
        </p>
      </div>
    </main>
  )
}
