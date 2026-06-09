'use client'

import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EstadoComparacion = 'en_analisis' | 'listo' | 'entregado'
type EstadoPliego = 'en_analisis' | 'pendiente' | 'listo'

interface Comparacion {
  id: string
  empresaNombre: string
  pliegoTitulo: string
  score: number
  estado: EstadoComparacion
  fecha: string
}

interface PliegoEnCola {
  id: string
  titulo: string
  estado: EstadoPliego
  fecha: string
}

// ---------------------------------------------------------------------------
// Placeholder data — replace with API calls once endpoints are ready
// ---------------------------------------------------------------------------

const comparaciones: Comparacion[] = []
const pliegosEnCola: PliegoEnCola[] = []

const statsConfig = [
  { label: 'Empresas', value: 0, href: '/dashboard/empresas' },
  { label: 'Pliegos', value: 0, href: '/dashboard/pliegos' },
  { label: 'Comparaciones', value: 0, href: '/dashboard/comparaciones' },
]

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2.5" x2="8" y2="13.5" />
      <line x1="2.5" y1="8" x2="13.5" y2="8" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  )
}

function IconFileDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M9.5 1.5V4.5h3" />
      <path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
    </svg>
  )
}

function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6.5" width="12" height="8" rx=".5" />
      <path d="M5.5 6.5V4a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v2.5" />
      <line x1="6.5" y1="11" x2="9.5" y2="11" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-ochre-dim text-ochre'
      : score >= 40
        ? 'bg-amber-dim text-amber'
        : 'bg-terracotta-dim text-terracotta'
  return (
    <span
      className={`inline-flex items-center justify-center h-6 min-w-[2.25rem] px-2 rounded-full text-[11px] font-mono font-semibold tabular-nums ${cls}`}
    >
      {score}
    </span>
  )
}

const estadoComparacionMap: Record<EstadoComparacion, { label: string; cls: string }> = {
  en_analisis: { label: 'En análisis', cls: 'bg-amber-dim text-amber' },
  listo: { label: 'Listo para revisar', cls: 'bg-terracotta-dim text-terracotta' },
  entregado: { label: 'Entregado', cls: 'bg-surface-2 text-ink-3' },
}

const estadoPliegoMap: Record<EstadoPliego, { label: string; cls: string }> = {
  en_analisis: { label: 'En análisis', cls: 'bg-amber-dim text-amber' },
  pendiente: { label: 'Pendiente', cls: 'bg-surface-2 text-ink-3' },
  listo: { label: 'Listo', cls: 'bg-ochre-dim text-ochre' },
}

function StatusPill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

function EmpresaAvatar({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-terracotta-dim flex items-center justify-center shrink-0 [&_span]:text-terracotta">
      <span className="text-[13px] font-semibold text-terracotta select-none">{initials}</span>
    </div>
  )
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 rounded-md bg-surface-2 animate-pulse ${className ?? ''}`} />
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-7">
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[16px] border border-border-subtle bg-surface p-5 space-y-2">
            <SkeletonLine className="w-12 h-8" />
            <SkeletonLine className="w-20" />
          </div>
        ))}
      </div>
      {/* List skeleton */}
      <div className="grid grid-cols-[1fr_260px] gap-7">
        <div className="space-y-0">
          <SkeletonLine className="w-36 mb-5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-4 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-full bg-surface-2 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine className="w-40" />
                <SkeletonLine className="w-56" />
              </div>
              <SkeletonLine className="w-24 h-6 rounded-full" />
              <SkeletonLine className="w-16" />
            </div>
          ))}
        </div>
        <div>
          <SkeletonLine className="w-24 mb-5" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-4 border-b border-border-subtle">
              <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine className="w-32" />
                <SkeletonLine className="w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/abogados/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          nombre: session.user.name,
        }),
      }).catch(console.error)
    }
  }, [session])

  const isEmpty = comparaciones.length === 0 && pliegosEnCola.length === 0

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Topbar */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/empresas/nueva"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150"
          >
            <IconPlus />
            Empresa
          </Link>
          <Link
            href="/dashboard/pliegos/nuevo"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
          >
            <IconPlus />
            Subir pliego
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Content */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        {isPending ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-7">

            {/* Stats row — always visible */}
            <div className="grid grid-cols-3 gap-4">
              {statsConfig.map((stat) => (
                <Link
                  key={stat.href}
                  href={stat.href}
                  className="rounded-[16px] border border-border-subtle bg-surface p-5 hover:bg-surface-2 transition-colors duration-150 group"
                >
                  <p className="text-[32px] font-bold text-ochre font-mono tabular-nums leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[13px] text-ink-2 mt-2">{stat.label}</p>
                </Link>
              ))}
            </div>

            {isEmpty ? (
              /* Two-column empty state — teaches the workflow */
              <div className="grid grid-cols-2 gap-4">
                {/* Column 1: Empresas */}
                <div className="rounded-[16px] border border-border-subtle p-7 flex flex-col">
                  <p className="text-[11px] font-medium text-ink-3 mb-3">Paso 1</p>
                  <h3 className="text-[15px] font-semibold text-ink mb-3 text-balance">
                    Agrega las empresas de tus clientes
                  </h3>
                  <p className="text-[13px] text-ink-2 leading-relaxed flex-1 text-pretty">
                    Registra cada empresa con su RUT, sector económico y capacidad financiera.
                    El sistema usa ese perfil para evaluar su compatibilidad con cada licitación del SECOP&nbsp;II.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/dashboard/empresas/nueva"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium border border-border text-ink-2 hover:text-ink hover:border-border transition-colors duration-150"
                    >
                      Agregar empresa
                      <IconArrow />
                    </Link>
                  </div>
                </div>

                {/* Column 2: Pliegos */}
                <div className="rounded-[16px] border border-border-subtle p-7 flex flex-col">
                  <p className="text-[11px] font-medium text-ink-3 mb-3">Paso 2</p>
                  <h3 className="text-[15px] font-semibold text-ink mb-3 text-balance">
                    Sube un pliego del SECOP&nbsp;II
                  </h3>
                  <p className="text-[13px] text-ink-2 leading-relaxed flex-1 text-pretty">
                    Carga el pliego de condiciones. El sistema extrae los requisitos, los cruza contra
                    el perfil de cada empresa y calcula un score de compatibilidad de 0 a 100.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/dashboard/pliegos/nuevo"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
                    >
                      Subir pliego
                      <IconArrow />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Data layout */
              <div className="grid grid-cols-[1fr_260px] gap-7 items-start">

                {/* Left: Comparaciones recientes */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold text-ink">Comparaciones recientes</h2>
                    <Link
                      href="/dashboard/comparaciones"
                      className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150"
                    >
                      Ver todas
                    </Link>
                  </div>
                  <div>
                    {comparaciones.map((c) => {
                      const { label, cls } = estadoComparacionMap[c.estado]
                      return (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 py-3.5 border-b border-border-subtle hover:bg-surface transition-colors duration-150 rounded-sm cursor-pointer -mx-2 px-2"
                        >
                          <EmpresaAvatar nombre={c.empresaNombre} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-ink truncate">
                              {c.empresaNombre}
                            </p>
                            <p className="text-[13px] text-ink-2 truncate mt-0.5">
                              {c.pliegoTitulo}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <ScoreBadge score={c.score} />
                            <StatusPill label={label} cls={cls} />
                            <span className="text-[12px] text-ink-3 font-mono tabular-nums w-14 text-right">
                              {c.fecha}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* Right: Pliegos en cola */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold text-ink">En cola</h2>
                    <Link
                      href="/dashboard/pliegos"
                      className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150"
                    >
                      Ver todos
                    </Link>
                  </div>
                  <div>
                    {pliegosEnCola.length === 0 ? (
                      <p className="text-[13px] text-ink-3 py-4">Sin pliegos en cola.</p>
                    ) : (
                      pliegosEnCola.map((p) => {
                        const { label, cls } = estadoPliegoMap[p.estado]
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 py-3.5 border-b border-border-subtle hover:bg-surface transition-colors duration-150 rounded-sm cursor-pointer -mx-2 px-2"
                          >
                            <div className="w-8 h-8 rounded-full bg-ochre-dim flex items-center justify-center shrink-0 [&_svg]:text-ochre">
                              <IconFileDoc />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-ink line-clamp-2 leading-snug">
                                {p.titulo}
                              </p>
                              <p className="text-[12px] text-ink-3 font-mono tabular-nums mt-0.5">
                                {p.fecha}
                              </p>
                            </div>
                            <StatusPill label={label} cls={cls} />
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
