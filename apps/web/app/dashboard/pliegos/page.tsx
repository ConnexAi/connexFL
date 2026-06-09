'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import type { PliegoListItem, EstadoPliego } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const estadoMap: Record<EstadoPliego, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-surface-2 text-ink-3' },
  analizando: { label: 'Analizando', cls: 'bg-amber-dim text-amber' },
  listo: { label: 'Listo', cls: 'bg-ochre-dim text-ochre' },
  error: { label: 'Error', cls: 'bg-terracotta-dim text-terracotta' },
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2.5" x2="8" y2="13.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 10 8l-4 4.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border-subtle px-1">
      <div className="w-9 h-9 rounded-full bg-surface-2 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-surface-2 rounded animate-pulse w-56" />
        <div className="h-3 bg-surface-2 rounded animate-pulse w-32" />
      </div>
      <div className="h-6 bg-surface-2 rounded-full animate-pulse w-20" />
      <div className="h-6 bg-surface-2 rounded animate-pulse w-9" />
      <div className="h-3 bg-surface-2 rounded animate-pulse w-20 hidden md:block" />
      <div className="w-4 h-4 bg-surface-2 rounded animate-pulse" />
    </div>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-ochre-dim text-ochre'
      : score >= 40
        ? 'bg-amber-dim text-amber'
        : 'bg-terracotta-dim text-terracotta'
  return (
    <span className={`inline-flex items-center justify-center h-6 min-w-[2.25rem] px-2 rounded-full text-[11px] font-mono font-semibold tabular-nums shrink-0 ${cls}`}>
      {score}
    </span>
  )
}

function PliegoRow({ pliego }: { pliego: PliegoListItem }) {
  const { label, cls } = estadoMap[pliego.estado]
  return (
    <Link
      href={`/dashboard/pliegos/${pliego.id}`}
      className="flex items-center gap-4 py-4 border-b border-border-subtle px-1 rounded-sm hover:bg-surface transition-colors duration-150 group -mx-1"
    >
      {/* Icon circle */}
      <div className="w-9 h-9 rounded-full bg-ochre-dim flex items-center justify-center shrink-0 [&_svg]:text-ochre">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
          <path d="M9.5 1.5V4.5h3" />
          <path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
        </svg>
      </div>

      {/* Name + entidad */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink truncate">{pliego.nombre}</p>
        <p className="text-[12px] text-ink-2 truncate mt-0.5">
          {pliego.entidad ?? <span className="text-ink-3">Sin entidad</span>}
          {pliego.fecha_limite && (
            <> · <span className="text-ink-3">Límite {formatDate(pliego.fecha_limite)}</span></>
          )}
        </p>
      </div>

      {/* Estado */}
      <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${cls}`}>
        {label}
      </span>

      {/* Score promedio */}
      {pliego.score_promedio != null ? (
        <ScoreBadge score={pliego.score_promedio} />
      ) : (
        <span className="w-9 text-center text-[11px] text-ink-3 shrink-0">—</span>
      )}

      {/* Fecha */}
      <span className="hidden md:block w-24 text-[12px] text-ink-3 font-mono tabular-nums shrink-0 text-right">
        {formatDate(pliego.created_at)}
      </span>

      {/* Chevron */}
      <span className="text-ink-3 group-hover:text-ink-2 transition-colors duration-150 shrink-0">
        <IconChevron />
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PliegosPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [pliegos, setPliegos] = useState<PliegoListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    fetch(`${API}/api/pliegos`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        const data: PliegoListItem[] = await res.json()
        setPliegos(data)
      })
      .catch(() => setError('No se pudieron cargar los pliegos. Intenta de nuevo.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
        </header>
        <div className="px-8 py-7 space-y-0">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">Pliegos</h1>
        <Link
          href="/dashboard/pliegos/nuevo"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
        >
          <IconPlus />
          Subir pliego
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        {error && (
          <div className="mb-5 px-4 py-3 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : pliegos.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-xs">
              <p className="text-[14px] font-semibold text-ink mb-2">Sin pliegos cargados</p>
              <p className="text-[13px] text-ink-2 leading-relaxed mb-6 text-pretty">
                Sube el pliego de condiciones de una licitación del SECOP&nbsp;II para que el sistema analice los requisitos.
              </p>
              <Link
                href="/dashboard/pliegos/nuevo"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
              >
                <IconPlus />
                Subir primer pliego
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 pb-2.5 border-b border-border px-1">
              <div className="w-9 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-[11px] font-medium text-ink-3">Pliego</span>
              <span className="text-[11px] font-medium text-ink-3 w-20 shrink-0">Estado</span>
              <span className="text-[11px] font-medium text-ink-3 w-9 text-center shrink-0">Score</span>
              <span className="hidden md:block w-24 text-[11px] font-medium text-ink-3 shrink-0 text-right">Subido</span>
              <div className="w-4 shrink-0" aria-hidden="true" />
            </div>
            <div>
              {pliegos.map((p) => <PliegoRow key={p.id} pliego={p} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
