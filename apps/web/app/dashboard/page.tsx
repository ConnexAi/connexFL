'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { EmpresaListItem, PliegoListItem, EstadoPliego } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const estadoPliegoMap: Record<EstadoPliego, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-surface-2 text-ink-3' },
  analizando: { label: 'Analizando', cls: 'bg-amber-dim text-amber' },
  listo:      { label: 'Listo',      cls: 'bg-ochre-dim text-ochre' },
  error:      { label: 'Error',      cls: 'bg-terracotta-dim text-terracotta' },
}

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

function EmpresaAvatar({ nombre }: { nombre: string }) {
  const initials = nombre
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-terracotta-dim flex items-center justify-center shrink-0">
      <span className="text-[12px] font-semibold text-terracotta select-none">{initials}</span>
    </div>
  )
}

function StatusPill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
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
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[16px] border border-border-subtle bg-surface p-5 space-y-2">
            <SkeletonLine className="w-12 h-8" />
            <SkeletonLine className="w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_260px] gap-7">
        <div className="space-y-0">
          <SkeletonLine className="w-36 mb-5" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-4 border-b border-border-subtle">
              <div className="w-9 h-9 rounded-full bg-surface-2 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine className="w-40" />
                <SkeletonLine className="w-56" />
              </div>
              <SkeletonLine className="w-24 h-6 rounded-full" />
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

  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([])
  const [pliegos, setPliegos] = useState<PliegoListItem[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/login')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/abogados/sync`, {
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

  useEffect(() => {
    if (!session) return
    setIsDataLoading(true)
    Promise.all([api.empresas.list(), api.pliegos.list()])
      .then(([e, p]) => {
        setEmpresas(e)
        setPliegos(p)
      })
      .catch(console.error)
      .finally(() => setIsDataLoading(false))
  }, [session])

  const totalComparaciones = pliegos.filter((p) => p.estado === 'listo').length
  const statsConfig = [
    { label: 'Empresas', value: empresas.length, href: '/dashboard/empresas' },
    { label: 'Pliegos', value: pliegos.length, href: '/dashboard/pliegos' },
    { label: 'Analizados', value: totalComparaciones, href: '/dashboard/pliegos' },
  ]

  const isEmpty = empresas.length === 0 && pliegos.length === 0
  const recentPliegos = pliegos.slice(0, 8)
  const queuePliegos = pliegos.filter((p) => p.estado !== 'listo').slice(0, 5)

  return (
    <>
      {/* Topbar */}
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

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        {isPending || isDataLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="space-y-7">

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {statsConfig.map((stat) => (
                <Link
                  key={stat.href + stat.label}
                  href={stat.href}
                  className="rounded-[16px] border border-border-subtle bg-surface p-5 hover:bg-surface-2 transition-colors duration-150"
                >
                  <p className="text-[32px] font-bold text-ochre font-mono tabular-nums leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[13px] text-ink-2 mt-2">{stat.label}</p>
                </Link>
              ))}
            </div>

            {isEmpty ? (
              /* Onboarding empty state */
              <div className="grid grid-cols-2 gap-4">
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
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium border border-border text-ink-2 hover:text-ink transition-colors duration-150"
                    >
                      Agregar empresa
                      <IconArrow />
                    </Link>
                  </div>
                </div>
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

                {/* Left: Pliegos recientes */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[15px] font-semibold text-ink">Pliegos recientes</h2>
                    <Link
                      href="/dashboard/pliegos"
                      className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150"
                    >
                      Ver todos
                    </Link>
                  </div>
                  {recentPliegos.length === 0 ? (
                    <p className="text-[13px] text-ink-3 py-4">Sin pliegos aún.</p>
                  ) : (
                    <div>
                      {recentPliegos.map((p) => {
                        const { label, cls } = estadoPliegoMap[p.estado]
                        return (
                          <Link
                            key={p.id}
                            href={`/dashboard/pliegos/${p.id}`}
                            className="flex items-center gap-3 py-3.5 border-b border-border-subtle hover:bg-surface transition-colors duration-150 rounded-sm -mx-2 px-2"
                          >
                            <div className="w-9 h-9 rounded-full bg-ochre-dim flex items-center justify-center shrink-0 [&_svg]:text-ochre">
                              <IconFileDoc />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-ink truncate">{p.nombre}</p>
                              <p className="text-[12px] text-ink-3 font-mono tabular-nums mt-0.5">
                                {formatDate(p.created_at)}
                              </p>
                            </div>
                            <StatusPill label={label} cls={cls} />
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* Right: Cola de pliegos pendientes */}
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
                  {queuePliegos.length === 0 ? (
                    <p className="text-[13px] text-ink-3 py-4">Sin pliegos pendientes.</p>
                  ) : (
                    <div>
                      {queuePliegos.map((p) => {
                        const { label, cls } = estadoPliegoMap[p.estado]
                        return (
                          <Link
                            key={p.id}
                            href={`/dashboard/pliegos/${p.id}`}
                            className="flex items-center gap-3 py-3.5 border-b border-border-subtle hover:bg-surface transition-colors duration-150 rounded-sm -mx-2 px-2"
                          >
                            <EmpresaAvatar nombre={p.nombre} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-ink line-clamp-2 leading-snug">
                                {p.nombre}
                              </p>
                              <p className="text-[12px] text-ink-3 font-mono tabular-nums mt-0.5">
                                {formatDate(p.created_at)}
                              </p>
                            </div>
                            <StatusPill label={label} cls={cls} />
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </section>

              </div>
            )}

          </div>
        )}
      </div>
    </>
  )
}
