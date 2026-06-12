'use client'

import Link from 'next/link'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function CTASection() {
  const { ref, visible } = useScrollAnimation(0.2)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 px-6"
    >
      <div
        className={[
          'max-w-3xl mx-auto rounded-2xl border border-border bg-surface p-12 text-center',
          'transition-all duration-700',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
        ].join(' ')}
      >
        <h2
          className="text-3xl sm:text-4xl font-bold text-ink tracking-tight text-balance mb-4"
          style={{ letterSpacing: '-0.02em' }}
        >
          Empieza hoy. Sin tarjeta.<br />Sin compromisos.
        </h2>
        <p className="text-[15px] text-ink-2 mb-10 max-w-md mx-auto">
          Sube tu primer pliego del SECOP II y obtén un análisis completo en menos de dos minutos.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-md bg-terracotta text-white text-[15px] font-medium hover:bg-terracotta-hover transition-colors shadow-lg"
          style={{ boxShadow: '0 0 32px oklch(0.58 0.135 32 / 0.3)' }}
        >
          Crear cuenta con Google
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  )
}
