'use client'

import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

export default function LoginPage() {
  async function handleGoogleLogin() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard`,
    })
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F4F6F8]" style={{ color: '#111827' }}>

      {/* Left: form */}
      <main className="flex flex-col justify-center px-8 py-16 lg:px-16 bg-white">
        <div className="max-w-sm w-full mx-auto">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-12 group">
            <div className="w-7 h-7 rounded-full bg-[#E8593C] flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white tracking-tight leading-none">CX</span>
            </div>
            <span className="text-[15px] font-semibold text-[#111827]">Connex</span>
          </Link>

          <h1 className="text-[26px] font-bold text-[#111827] mb-2" style={{ letterSpacing: '-0.02em' }}>
            Accede a tu cuenta
          </h1>
          <p className="text-[14px] text-[#6B7280] mb-10 leading-relaxed">
            IA para licitaciones del SECOP II. Análisis, comparación y documentos en minutos.
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg border border-[#E8ECF0] bg-white text-[14px] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-colors duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="mt-8 text-[11px] text-[#9CA3AF] text-center">
            Al continuar aceptas los términos de uso del servicio.
          </p>
        </div>
      </main>

      {/* Right: features */}
      <div className="hidden lg:flex flex-col justify-between bg-[#F4F6F8] border-l border-[#E8ECF0] p-12">
        <div />
        <div className="space-y-8">
          {[
            {
              title: 'Análisis automático de pliegos',
              desc: 'Extrae requisitos habilitantes, criterios de ponderación y fechas clave de cualquier pliego del SECOP II.',
            },
            {
              title: 'Score de compatibilidad',
              desc: 'Compara cada licitación con el perfil de tus empresas. Ranking de 0 a 100 con justificación detallada.',
            },
            {
              title: 'Documentos listos para entregar',
              desc: 'Genera los anexos con los datos correctos de cada empresa. Descarga en Word editables.',
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg bg-white border border-[#E8ECF0] flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <span className="text-[11px] font-bold text-[#E8593C]">0{i + 1}</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111827] mb-1">{item.title}</p>
                <p className="text-[13px] text-[#6B7280] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#9CA3AF]">&copy; {new Date().getFullYear()} Connex for Lawyers</p>
      </div>
    </div>
  )
}
