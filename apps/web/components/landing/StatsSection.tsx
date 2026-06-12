'use client'

import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { useCountUp } from '@/hooks/useCountUp'

const stats = [
  { value: 85, suffix: '%', label: 'reducción en tiempo de análisis' },
  { value: 3, suffix: 'x', label: 'más licitaciones revisadas por semana' },
  { value: 12, suffix: 'min', label: 'para generar anexos completos' },
  { value: 97, suffix: '%', label: 'de campos llenados correctamente' },
]

function StatItem({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) {
  const count = useCountUp(value, 1800, active)

  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl font-bold text-ink mb-2 tabular-nums">
        <span>{count}</span>
        <span className="text-terracotta">{suffix}</span>
      </div>
      <p className="text-[13px] text-ink-2 max-w-[160px] mx-auto leading-snug">{label}</p>
    </div>
  )
}

export default function StatsSection() {
  const { ref, visible } = useScrollAnimation(0.2)

  return (
    <section
      id="resultados"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-20 border-y border-border-subtle"
    >
      <div className="max-w-5xl mx-auto px-6">
        <div
          className={[
            'grid grid-cols-2 md:grid-cols-4 gap-10',
            'transition-all duration-700',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
          ].join(' ')}
        >
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} active={visible} />
          ))}
        </div>
      </div>
    </section>
  )
}
