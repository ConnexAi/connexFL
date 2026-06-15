'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, ApiUnauthorizedError } from '@/lib/api'
import type { EmpresaListItem, LicitacionListItem, ComparacionConEmpresa } from '@/lib/types'
import { Plus, FileText, ArrowRight, Building2, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.toLocaleString('es-CO', { month: 'short' }).replace(/\./g, '')
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

const estadoLicitacionMap: Record<string, { label: string; cls: string }> = {
  activa:     { label: 'Activa',     cls: 'bg-[#DCFCE7] text-[#15803D]' },
  adjudicada: { label: 'Adjudicada', cls: 'bg-[#FEF9C3] text-[#854D0E]' },
  archivada:  { label: 'Archivada',  cls: 'bg-[#F3F4F6] text-[#6B7280]' },
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 rounded bg-border animate-pulse ${className ?? ''}`} />
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-6">
        <div className="rounded-2xl bg-surface border border-border p-8 h-44 animate-pulse" />
        <div className="grid grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl bg-surface border border-border p-6 h-28 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-border animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine className="w-48" />
                <SkeletonLine className="w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildChartData(licitaciones: LicitacionListItem[]) {
  const last6: Record<string, number> = {}
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleString('es-CO', { month: 'short' }).replace(/\./g, '')
    last6[key] = 0
  }
  for (const l of licitaciones) {
    const d = new Date(l.created_at)
    const key = d.toLocaleString('es-CO', { month: 'short' }).replace(/\./g, '')
    if (key in last6) last6[key] = (last6[key] ?? 0) + 1
  }
  return Object.entries(last6).map(([mes, valor]) => ({ mes, valor }))
}

function buildScoreData(comparaciones: ComparacionConEmpresa[]) {
  return [...comparaciones]
    .filter((c) => c.score !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .reverse()
    .map((c) => ({
      name: c.empresa_nombre.length > 20 ? c.empresa_nombre.slice(0, 20) + '…' : c.empresa_nombre,
      score: c.score as number,
      fill: (c.score as number) >= 70 ? '#059669' : (c.score as number) >= 50 ? '#D97706' : '#DC2626',
    }))
}

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession()
  const router = useRouter()

  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([])
  const [licitaciones, setLicitaciones] = useState<LicitacionListItem[]>([])
  const [comparaciones, setComparaciones] = useState<ComparacionConEmpresa[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) router.push('/login')
  }, [session, isPending, router])

  useEffect(() => {
    if (session?.user) {
      fetch(`${API_URL}/api/abogados/sync`, {
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
    setApiError(null)
    Promise.all([api.empresas.list(), api.licitaciones.list(), api.comparaciones.list()])
      .then(([e, l, c]) => { setEmpresas(e); setLicitaciones(l); setComparaciones(c) })
      .catch((err: unknown) => {
        if (err instanceof ApiUnauthorizedError) {
          router.push('/login')
        } else {
          setApiError('No se pudieron cargar los datos. Verifica que el servidor esté en línea.')
        }
      })
      .finally(() => setIsDataLoading(false))
  }, [session, router])

  if (isPending || isDataLoading) return <LoadingSkeleton />
  if (!session) return null

  const totalListos = licitaciones.filter((l) => l.ultima_fase_listo !== null).length
  const recentLicitaciones = licitaciones.slice(0, 8)
  const isEmpty = empresas.length === 0 && licitaciones.length === 0
  const firstName = session.user?.name?.split(' ')[0] ?? 'abogado'
  const chartData = buildChartData(licitaciones)
  const scoreData = buildScoreData(comparaciones)

  if (apiError) {
    return (
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-sm text-center">
          <div className="px-4 py-3.5 rounded-xl bg-terracotta-dim border border-terracotta/20 text-[14px] text-terracotta mb-4"
            style={OF}>
            {apiError}
          </div>
          <button
            type="button"
            onClick={() => { setApiError(null); setIsDataLoading(true) }}
            className="text-[14px] text-ink-2 hover:text-ink transition-colors"
            style={OF}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8 space-y-6" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>

        {/* Welcome banner — 2 cols */}
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <p className="text-[13px] text-ink-3 mb-1" style={{ ...OF, fontWeight: 500 }}>Bienvenido</p>
            <h1 className="text-[26px] text-ink leading-tight mb-5" style={{ ...OF, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Buenos días, {firstName}
            </h1>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[36px] leading-none text-ink" style={{ ...OF, fontWeight: 700 }}>{empresas.length}</p>
                <p className="text-[13px] text-ink-3 mt-1" style={{ ...OF, fontWeight: 500 }}>Empresas</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[36px] leading-none text-ink" style={{ ...OF, fontWeight: 700 }}>{licitaciones.length}</p>
                <p className="text-[13px] text-ink-3 mt-1" style={{ ...OF, fontWeight: 500 }}>Licitaciones</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-[36px] leading-none text-ink" style={{ ...OF, fontWeight: 700 }}>{totalListos}</p>
                <p className="text-[13px] text-ink-3 mt-1" style={{ ...OF, fontWeight: 500 }}>Analizadas</p>
              </div>
            </div>
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={22}>
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9CA3AF', fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E8ECF0',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#111827',
                    fontFamily: 'var(--font-outfit, Outfit, sans-serif)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="valor" fill="#E8593C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {isEmpty ? (
          /* Onboarding */
          <div className="grid grid-cols-2 gap-6">
            {[
              {
                step: '01',
                icon: <Building2 size={20} color="#374151" />,
                title: 'Agrega las empresas de tus clientes',
                desc: 'Registra el RUT, sector económico y contratos anteriores. El sistema construye el perfil automáticamente.',
                href: '/dashboard/empresas/nueva',
                label: 'Agregar empresa',
                primary: false,
              },
              {
                step: '02',
                icon: <FileText size={20} color="#374151" />,
                title: 'Sube un pliego del SECOP II',
                desc: 'El sistema extrae requisitos, cruza con el perfil de cada empresa y calcula un score de 0 a 100.',
                href: '/dashboard/licitaciones/nueva',
                label: 'Subir pliego',
                primary: true,
              },
            ].map((card) => (
              <div
                key={card.step}
                className="bg-surface rounded-2xl border border-border p-8 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
                    {card.icon}
                  </div>
                  <span className="text-[12px] text-ink-3" style={{ ...OF, fontWeight: 600 }}>{card.step}</span>
                </div>
                <h3 className="text-[16px] text-ink mb-2 leading-snug" style={{ ...OF, fontWeight: 600 }}>{card.title}</h3>
                <p className="text-[14px] text-ink-2 leading-relaxed flex-1" style={{ ...OF, fontWeight: 500 }}>{card.desc}</p>
                <div className="mt-6">
                  <Link
                    href={card.href}
                    className={[
                      'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] transition-colors',
                      card.primary
                        ? 'bg-terracotta text-white hover:bg-terracotta-hover'
                        : 'border border-border text-ink-2 hover:text-ink hover:bg-bg',
                    ].join(' ')}
                    style={{ ...OF, fontWeight: 600 }}
                  >
                    {card.label}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats cards — purely informative, no links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                {
                  label: 'Empresas registradas',
                  value: empresas.length,
                  icon: <Building2 size={18} color="#374151" />,
                },
                {
                  label: 'Licitaciones activas',
                  value: licitaciones.filter(l => l.estado === 'activa').length,
                  icon: <FileText size={18} color="#374151" />,
                },
                {
                  label: 'Fases analizadas',
                  value: totalListos,
                  icon: <TrendingUp size={18} color="#374151" />,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                  style={{ minWidth: 0 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center mb-4">
                    {stat.icon}
                  </div>
                  <p className="text-[36px] leading-none text-ink" style={{ ...OF, fontWeight: 700 }}>{stat.value}</p>
                  <p className="text-[14px] text-ink-2 mt-2" style={{ ...OF, fontWeight: 500 }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Licitaciones recientes — full width */}
            <section className="bg-surface rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
                <h2 className="text-[18px] text-ink" style={{ ...OF, fontWeight: 600 }}>Licitaciones recientes</h2>
                <Link href="/dashboard/pliegos"
                  className="text-[13px] text-terracotta hover:text-terracotta-hover transition-colors"
                  style={{ ...OF, fontWeight: 600 }}>
                  Ver todas
                </Link>
              </div>
              {recentLicitaciones.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-[14px] text-ink-3" style={OF}>Sin licitaciones aún.</p>
                  <Link href="/dashboard/licitaciones/nueva"
                    className="inline-flex items-center gap-1.5 mt-4 text-[14px] text-terracotta hover:text-terracotta-hover transition-colors"
                    style={{ ...OF, fontWeight: 600 }}>
                    <Plus size={13} />
                    Nueva licitación
                  </Link>
                </div>
              ) : (
                <div>
                  {recentLicitaciones.map((l) => {
                    const badge = estadoLicitacionMap[l.estado] ?? { label: 'Activa', cls: 'bg-[#DCFCE7] text-[#15803D]' }
                    const { label, cls } = badge
                    return (
                      <Link
                        key={l.id}
                        href={`/dashboard/licitaciones/${l.id}`}
                        className="flex items-center gap-3 px-6 py-3.5 border-b border-border last:border-0 hover:bg-bg transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                          <FileText size={14} color="#374151" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-ink truncate" style={{ ...OF, fontWeight: 600 }}>{l.nombre}</p>
                          <p className="text-[13px] text-ink-3 mt-0.5 date-caption">{formatDate(l.created_at)}</p>
                        </div>
                        <span className={`inline-flex items-center h-[22px] px-2.5 rounded-[6px] text-[12px] whitespace-nowrap shrink-0 ${cls}`}
                          style={{ ...OF, fontWeight: 600 }}>
                          {label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Últimos scores — BarChart horizontal */}
            {scoreData.length > 0 && (
              <section className="bg-surface rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[18px] text-ink" style={{ ...OF, fontWeight: 600 }}>Últimos scores de compatibilidad</h2>
                  <Link href="/dashboard/comparaciones"
                    className="text-[13px] text-terracotta hover:text-terracotta-hover transition-colors"
                    style={{ ...OF, fontWeight: 600 }}>
                    Ver todos
                  </Link>
                </div>
                <div style={{ height: scoreData.length * 44 + 24 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scoreData}
                      layout="vertical"
                      barSize={20}
                      margin={{ left: 8, right: 40, top: 0, bottom: 0 }}
                    >
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        width={160}
                        tick={{ fontSize: 13, fill: '#374151', fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}
                      />
                      <Tooltip
                        formatter={(value) => [value != null ? `${value} / 100` : '—', 'Score']}
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #E8ECF0',
                          borderRadius: 8,
                          fontSize: 13,
                          fontFamily: 'var(--font-outfit, Outfit, sans-serif)',
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {scoreData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}

      </div>
    </div>
  )
}
