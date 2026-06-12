'use client'

import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.95 0.005 55) 1px, transparent 1px),
                            linear-gradient(90deg, oklch(0.95 0.005 55) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
        aria-hidden="true"
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, oklch(0.58 0.135 32) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border text-[12px] text-ink-2 mb-8 animate-fade-in-up"
          style={{ animationDelay: '0ms' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-terracotta" />
          IA para contratación pública colombiana
        </div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold text-ink tracking-tight leading-[1.05] text-balance mb-6 animate-fade-in-up"
          style={{ animationDelay: '80ms', letterSpacing: '-0.03em' }}
        >
          Gana más licitaciones.<br />
          <span className="text-terracotta">Sin perder horas.</span>
        </h1>

        <p
          className="max-w-xl text-[17px] text-ink-2 leading-relaxed mb-10 text-balance animate-fade-in-up"
          style={{ animationDelay: '160ms' }}
        >
          Connex analiza pliegos del SECOP II, compara licitaciones con el perfil de tus empresas y genera los documentos listos para presentar.
        </p>

        <div
          className="flex flex-col sm:flex-row items-center gap-3 animate-fade-in-up"
          style={{ animationDelay: '240ms' }}
        >
          <Link
            href="/login"
            className="px-6 py-3 rounded-md bg-terracotta text-white text-[14px] font-medium hover:bg-terracotta-hover transition-colors shadow-lg shadow-terracotta-glow"
          >
            Empezar gratis
          </Link>
          <a
            href="#como-funciona"
            className="px-6 py-3 rounded-md text-ink-2 text-[14px] font-medium hover:text-ink transition-colors"
          >
            Ver cómo funciona
          </a>
        </div>

        {/* Mock dashboard preview */}
        <div
          className="relative mt-20 w-full max-w-3xl rounded-xl border border-border overflow-hidden shadow-2xl animate-fade-in-up"
          style={{ animationDelay: '360ms' }}
        >
          <div className="bg-surface border-b border-border-subtle px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-surface-3" />
              <span className="w-3 h-3 rounded-full bg-surface-3" />
              <span className="w-3 h-3 rounded-full bg-surface-3" />
            </div>
            <span className="flex-1 text-center text-[11px] text-ink-3 font-mono">connex.app/dashboard</span>
          </div>
          <div className="bg-bg p-6 grid grid-cols-3 gap-3 min-h-[200px]">
            {/* Simulated stat cards */}
            {[
              { label: 'Pliegos analizados', value: '24', color: 'text-ink' },
              { label: 'Score promedio', value: '78%', color: 'text-ochre' },
              { label: 'Anexos generados', value: '12', color: 'text-terracotta' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface rounded-lg p-4 border border-border-subtle">
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-[11px] text-ink-3">{stat.label}</div>
              </div>
            ))}
            <div className="col-span-3 bg-surface rounded-lg p-4 border border-border-subtle flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-2 bg-surface-3 rounded-full w-3/4" />
                <div className="h-2 bg-surface-3 rounded-full w-1/2" />
                <div className="h-2 bg-surface-3 rounded-full w-2/3" />
              </div>
              <div className="w-20 h-16 bg-terracotta-dim rounded-lg flex items-center justify-center">
                <span className="text-terracotta text-xl font-bold">78</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
