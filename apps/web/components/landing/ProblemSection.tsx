'use client'

import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const problems = [
  {
    title: 'Análisis manual tarda días',
    description: 'Revisar un pliego de 200 páginas, extraer requisitos y evaluar viabilidad consume tiempo que podrías dedicar a tus clientes.',
    chart: <ManualTimeChart />,
  },
  {
    title: 'Documentos llenos de errores',
    description: 'Llenar anexos con datos incorrectos o incompletos puede descalificar una oferta. Los errores tipográficos cuestan contratos.',
    chart: <ErrorRateChart />,
  },
  {
    title: 'Oportunidades perdidas',
    description: 'Sin un sistema de seguimiento, las licitaciones relevantes pasan desapercibidas o se identifican cuando ya es demasiado tarde.',
    chart: <OpportunityChart />,
  },
]

function ManualTimeChart() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full" aria-hidden="true">
      <rect x="10" y="50" width="18" height="22" rx="2" fill="oklch(0.58 0.135 32 / 0.3)" />
      <rect x="35" y="35" width="18" height="37" rx="2" fill="oklch(0.58 0.135 32 / 0.5)" />
      <rect x="60" y="18" width="18" height="54" rx="2" fill="oklch(0.58 0.135 32 / 0.7)" />
      <rect x="85" y="8" width="18" height="64" rx="2" fill="oklch(0.58 0.135 32)" />
      <text x="10" y="78" fontSize="8" fill="oklch(0.40 0.005 55)" fontFamily="sans-serif">Lun</text>
      <text x="35" y="78" fontSize="8" fill="oklch(0.40 0.005 55)" fontFamily="sans-serif">Mar</text>
      <text x="60" y="78" fontSize="8" fill="oklch(0.40 0.005 55)" fontFamily="sans-serif">Mié</text>
      <text x="85" y="78" fontSize="8" fill="oklch(0.40 0.005 55)" fontFamily="sans-serif">Jue</text>
    </svg>
  )
}

function ErrorRateChart() {
  const r = 28
  const cx = 60
  const cy = 40
  const circumference = 2 * Math.PI * r
  const errorPct = 0.38
  const dashOffset = circumference * (1 - errorPct)

  return (
    <svg viewBox="0 0 120 80" className="w-full h-full" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="oklch(0.21 0.008 55)" strokeWidth="6" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="oklch(0.58 0.135 32)"
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="bold" fill="oklch(0.95 0.005 55)" fontFamily="sans-serif">38%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="oklch(0.40 0.005 55)" fontFamily="sans-serif">errores</text>
    </svg>
  )
}

function OpportunityChart() {
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full" aria-hidden="true">
      <polyline
        points="10,65 30,55 50,58 70,40 90,44 110,25"
        fill="none"
        stroke="oklch(0.58 0.135 32 / 0.4)"
        strokeWidth="2"
        strokeDasharray="4 2"
      />
      <polyline
        points="10,65 30,60 50,62 70,55 90,52 110,45"
        fill="none"
        stroke="oklch(0.58 0.135 32)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="110" cy="25" r="3" fill="oklch(0.58 0.135 32 / 0.4)" />
      <circle cx="110" cy="45" r="3" fill="oklch(0.58 0.135 32)" />
      <text x="10" y="78" fontSize="7" fill="oklch(0.40 0.005 55)" fontFamily="sans-serif">Oportunidades disponibles vs. aprovechadas</text>
    </svg>
  )
}

export default function ProblemSection() {
  const { ref, visible } = useScrollAnimation()

  return (
    <section
      id="problema"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 max-w-5xl mx-auto px-6"
    >
      <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <p className="text-terracotta text-[13px] font-medium mb-3">El problema</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight text-balance mb-4" style={{ letterSpacing: '-0.02em' }}>
          La contratación pública no debería<br />consumir tu semana entera
        </h2>
        <p className="text-ink-2 text-[16px] max-w-lg mb-16">
          Cada licitación que gestionas a mano es tiempo que no inviertes en estrategia legal para tus clientes.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {problems.map((problem, i) => (
          <div
            key={problem.title}
            className={[
              'rounded-xl border border-border-subtle bg-surface p-5',
              'transition-all duration-700',
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
            ].join(' ')}
            style={{ transitionDelay: `${120 + i * 80}ms` }}
          >
            <div className="h-24 mb-4">
              {problem.chart}
            </div>
            <h3 className="text-[15px] font-semibold text-ink mb-2">{problem.title}</h3>
            <p className="text-[13px] text-ink-2 leading-relaxed">{problem.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
