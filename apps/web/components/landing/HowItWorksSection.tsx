'use client'

import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const steps = [
  {
    number: '01',
    title: 'Sube el pliego',
    description: 'Carga el PDF o link del SECOP II. Claude lee y extrae requisitos habilitantes, criterios de ponderación y fechas clave en segundos.',
    detail: 'Soporta pliegos de hasta 300 páginas. Detecta inconsistencias automáticamente.',
  },
  {
    number: '02',
    title: 'Conecta tus empresas',
    description: 'Ingresa el RUT, estados financieros y contratos anteriores de cada empresa cliente. El sistema construye su perfil de manera automática.',
    detail: 'Perfil vectorizado para comparaciones precisas con cualquier licitación.',
  },
  {
    number: '03',
    title: 'Genera la oferta',
    description: 'Con un score de compatibilidad detallado, decides si ofertar. Luego Connex llena los anexos con los datos correctos de la empresa.',
    detail: 'Documentos Word editables, listos para firma y presentación.',
  },
]

export default function HowItWorksSection() {
  const { ref, visible } = useScrollAnimation(0.1)

  return (
    <section
      id="como-funciona"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 max-w-5xl mx-auto px-6"
    >
      <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <p className="text-terracotta text-[13px] font-medium mb-3">Cómo funciona</p>
        <h2
          className="text-3xl sm:text-4xl font-bold text-ink tracking-tight text-balance mb-16"
          style={{ letterSpacing: '-0.02em' }}
        >
          Tres pasos para una oferta<br />lista para presentar
        </h2>
      </div>

      <div className="space-y-px">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={[
              'group relative grid md:grid-cols-[200px_1fr] gap-8 py-10',
              i < steps.length - 1 ? 'border-b border-border-subtle' : '',
              'transition-all duration-700',
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4',
            ].join(' ')}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div>
              <span className="text-5xl font-bold text-border tabular-nums leading-none group-hover:text-terracotta-dim transition-colors duration-300">
                {step.number}
              </span>
            </div>
            <div>
              <h3 className="text-[20px] font-semibold text-ink mb-3">{step.title}</h3>
              <p className="text-[15px] text-ink-2 leading-relaxed mb-3">{step.description}</p>
              <p className="text-[13px] text-ink-3">{step.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
