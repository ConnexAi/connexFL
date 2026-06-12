'use client'

import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function SocialProofSection() {
  const { ref, visible } = useScrollAnimation(0.2)

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 border-t border-border-subtle"
    >
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div
          className={[
            'transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
          ].join(' ')}
        >
          <div className="flex items-center justify-center gap-1 mb-8" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-4 h-4 text-ochre" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          <blockquote className="text-[22px] sm:text-[26px] font-semibold text-ink leading-snug text-balance mb-8" style={{ letterSpacing: '-0.01em' }}>
            "Antes tardaba tres días en analizar un pliego y preparar los documentos. Ahora lo hago en una mañana, con menos errores y más confianza para decidir si vale la pena ofertar."
          </blockquote>

          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-terracotta-dim border border-terracotta flex items-center justify-center">
              <span className="text-terracotta text-[13px] font-bold">XR</span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-medium text-ink">Ximena Rodríguez</p>
              <p className="text-[12px] text-ink-3">Abogada, Contratación Pública — Cali</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
