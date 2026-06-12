'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import type { PliegoListItem, EstadoPliego } from '@/lib/types'
import { Plus, FileText, ArrowRight, ChevronRight, Calendar } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const estadoMap: Record<EstadoPliego, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-surface-2 text-ink-3' },
  analizando: { label: 'Analizando', cls: 'bg-amber-dim text-amber' },
  listo:      { label: 'Listo',      cls: 'bg-success-dim text-success' },
  error:      { label: 'Error',      cls: 'bg-terracotta-dim text-terracotta' },
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 70 ? 'bg-success-dim text-success'
    : score >= 40 ? 'bg-amber-dim text-amber'
    : 'bg-terracotta-dim text-terracotta'
  return (
    <span className={`inline-flex items-center justify-center h-6 min-w-[2.5rem] px-2 rounded-full text-[11px] font-mono font-semibold tabular-nums ${cls}`}>
      {score}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-border shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-border rounded w-48" />
          <div className="h-3 bg-border rounded w-32" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 bg-border rounded-full w-16" />
        <div className="h-5 bg-border rounded-full w-20" />
      </div>
    </div>
  )
}

function PliegoCard({ pliego }: { pliego: PliegoListItem }) {
  const { label, cls } = estadoMap[pliego.estado]

  return (
    <Link
      href={`/dashboard/pliegos/${pliego.id}`}
      className="bg-surface rounded-xl border border-border p-6 hover:shadow-[0_4px_16px_rgba(0,0,0,0.10)] transition-all duration-200 group flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-ochre-dim flex items-center justify-center shrink-0">
          <FileText size={16} className="text-ochre" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink leading-snug line-clamp-2">{pliego.nombre}</p>
          {pliego.entidad && (
            <p className="text-[11px] text-ink-3 mt-1 truncate">{pliego.entidad}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-1">
        <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium whitespace-nowrap ${cls}`}>
          {label}
        </span>
        {pliego.score_promedio != null && (
          <ScorePill score={pliego.score_promedio} />
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
          {pliego.fecha_limite ? (
            <>
              <Calendar size={11} />
              <span>Límite: {formatDate(pliego.fecha_limite)}</span>
            </>
          ) : (
            <span className="font-mono">{formatDate(pliego.created_at)}</span>
          )}
        </div>
        <span className="flex items-center gap-1 text-[12px] font-medium text-terracotta opacity-0 group-hover:opacity-100 transition-opacity">
          Ver análisis
          <ChevronRight size={12} />
        </span>
      </div>
    </Link>
  )
}

export default function PliegosPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const [pliegos, setPliegos] = useState<PliegoListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    fetch(`${API}/api/pliegos`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        setPliegos(await res.json() as PliegoListItem[])
      })
      .catch(() => setError('No se pudieron cargar los pliegos.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) return null
  if (!session) return null

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-bold text-ink" style={{ letterSpacing: '-0.01em' }}>Pliegos</h1>
            <p className="text-[14px] text-ink-2 mt-1">
              {isLoading ? 'Cargando...' : `${pliegos.length} ${pliegos.length === 1 ? 'pliego cargado' : 'pliegos cargados'}`}
            </p>
          </div>
          <Link
            href="/dashboard/pliegos/nuevo"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors shadow-[0_1px_3px_rgba(232,89,60,0.3)]"
          >
            <Plus size={14} />
            Subir pliego
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
            {Array.from({ length: 6 }, (_, i) => i).map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : pliegos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-ochre-dim flex items-center justify-center mb-4">
              <FileText size={24} className="text-ochre" />
            </div>
            <p className="text-[16px] font-semibold text-ink mb-2">Sin pliegos cargados</p>
            <p className="text-[13px] text-ink-2 text-center max-w-xs leading-relaxed mb-6">
              Sube el pliego de una licitación del SECOP II para comenzar el análisis.
            </p>
            <Link
              href="/dashboard/pliegos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
            >
              <Plus size={14} />
              Subir primer pliego
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
            {pliegos.map((p) => <PliegoCard key={p.id} pliego={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
