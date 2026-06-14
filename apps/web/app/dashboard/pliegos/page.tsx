'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import type { LicitacionListItem, TipoFase, EstadoLicitacion } from '@/lib/types'
import { Plus, ArrowRight } from 'lucide-react'

const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' }).replace(/\./g, '')} ${d.getFullYear()}`
}

const ESTADO_MAP: Record<EstadoLicitacion, { label: string; bg: string; color: string }> = {
  activa:     { label: 'Activa',     bg: '#FEF9C3', color: '#854D0E' },
  adjudicada: { label: 'Adjudicada', bg: '#DCFCE7', color: '#15803D' },
  archivada:  { label: 'Archivada',  bg: '#F3F4F6', color: '#6B7280' },
}

const FASE_MAP: Record<TipoFase, { label: string; bg: string; color: string }> = {
  prepliego:                { label: 'Pre-pliego',    bg: '#F3F4F6', color: '#6B7280' },
  pliego_definitivo:        { label: 'Pliego',        bg: '#FEF0ED', color: '#E8593C' },
  anexos:                   { label: 'Anexos',        bg: '#FEF9C3', color: '#854D0E' },
  evaluacion_observaciones: { label: 'En evaluación', bg: '#DCFCE7', color: '#15803D' },
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-border shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-border rounded w-48" />
          <div className="h-3 bg-border rounded w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-border rounded w-20" />
        <div className="h-5 bg-border rounded w-16" />
      </div>
      <div className="h-px bg-border" />
      <div className="h-3 bg-border rounded w-24" />
    </div>
  )
}

function LicitacionCard({ lic }: { lic: LicitacionListItem }) {
  const estado = ESTADO_MAP[lic.estado] ?? ESTADO_MAP.activa
  const fase = lic.ultima_fase_listo ? FASE_MAP[lic.ultima_fase_listo] : null

  return (
    <Link
      href={`/dashboard/licitaciones/${lic.id}`}
      className="bg-surface rounded-xl border border-border p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200 flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
            <path d="M9.5 1.5V4.5h3" />
            <path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-[#111827] leading-snug line-clamp-2" style={{ ...OF, fontWeight: 600 }}>
            {lic.nombre}
          </p>
          {lic.entidad_contratante && (
            <p className="text-[13px] text-[#6B7280] mt-0.5 truncate date-caption">{lic.entidad_contratante}</p>
          )}
          {lic.secop_id && (
            <p className="text-[12px] text-[#9CA3AF] mt-0.5 date-caption">{lic.secop_id}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 flex-1">
        <span
          className="inline-flex items-center h-[22px] px-2.5 rounded-[6px] text-[12px] whitespace-nowrap"
          style={{ ...OF, fontWeight: 600, background: estado.bg, color: estado.color }}
        >
          {estado.label}
        </span>
        {fase ? (
          <span
            className="inline-flex items-center h-[22px] px-2.5 rounded-[6px] text-[12px] whitespace-nowrap"
            style={{ ...OF, fontWeight: 600, background: fase.bg, color: fase.color }}
          >
            {fase.label}
          </span>
        ) : (
          <span
            className="inline-flex items-center h-[22px] px-2.5 rounded-[6px] text-[12px] whitespace-nowrap"
            style={{ ...OF, fontWeight: 600, background: '#F3F4F6', color: '#9CA3AF' }}
          >
            Sin análisis
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F0F4F8]">
        <p className="text-[13px] text-[#6B7280] date-caption">{formatDate(lic.created_at)}</p>
      </div>
    </Link>
  )
}

export default function LicitacionesListPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const [licitaciones, setLicitaciones] = useState<LicitacionListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    api.licitaciones.list()
      .then(setLicitaciones)
      .catch(() => setError('No se pudieron cargar las licitaciones.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) return null
  if (!session) return null

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] text-[#111827]" style={{ ...OF, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Licitaciones
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1" style={{ ...OF, fontWeight: 500 }}>
              {isLoading ? 'Cargando...' : `${licitaciones.length} ${licitaciones.length === 1 ? 'licitación' : 'licitaciones'}`}
            </p>
          </div>
          <Link
            href="/dashboard/licitaciones/nueva"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[14px] bg-terracotta text-white hover:bg-terracotta-hover transition-colors shadow-[0_1px_3px_rgba(232,89,60,0.3)]"
            style={{ ...OF, fontWeight: 600 }}
          >
            <Plus size={14} />
            Nueva licitación
          </Link>
        </div>

        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-xl border text-[14px]"
            style={{ background: '#FEE2E2', borderColor: 'rgba(220,38,38,0.2)', color: '#DC2626', ...OF }}
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }, (_, i) => i).map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : licitaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
                <path d="M9.5 1.5V4.5h3" />
                <path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
              </svg>
            </div>
            <p className="text-[16px] text-[#111827] mb-2" style={{ ...OF, fontWeight: 600 }}>Sin licitaciones</p>
            <p className="text-[14px] text-[#6B7280] text-center max-w-xs leading-relaxed mb-6" style={{ ...OF, fontWeight: 500 }}>
              Sube el pliego de condiciones de una licitación del SECOP&nbsp;II para empezar el análisis.
            </p>
            <Link
              href="/dashboard/licitaciones/nueva"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
              style={{ ...OF, fontWeight: 600 }}
            >
              <Plus size={14} />
              Nueva licitación
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {licitaciones.map((l) => <LicitacionCard key={l.id} lic={l} />)}
          </div>
        )}
      </div>
    </div>
  )
}
