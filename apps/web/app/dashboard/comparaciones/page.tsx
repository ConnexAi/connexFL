'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import type { ComparacionConEmpresa, PliegoListItem } from '@/lib/types'

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

interface PliegoGroup {
  pliegoId: string
  pliegoNombre: string
  analisisDate: string
  comparaciones: ComparacionConEmpresa[]
}

function buildGroups(
  comparaciones: ComparacionConEmpresa[],
  pliegosMap: Map<string, PliegoListItem>
): PliegoGroup[] {
  const map = new Map<string, ComparacionConEmpresa[]>()

  for (const c of comparaciones) {
    const arr = map.get(c.pliego_id) ?? []
    arr.push(c)
    map.set(c.pliego_id, arr)
  }

  const groups: PliegoGroup[] = []

  for (const [pliegoId, items] of map.entries()) {
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    const pliego = pliegosMap.get(pliegoId)
    const analisisDate = items.reduce((latest, c) =>
      c.created_at > latest ? c.created_at : latest, ''
    )

    groups.push({
      pliegoId,
      pliegoNombre: pliego?.nombre ?? `Pliego ${pliegoId.slice(0, 8)}`,
      analisisDate,
      comparaciones: items,
    })
  }

  groups.sort((a, b) => b.analisisDate.localeCompare(a.analisisDate))
  return groups
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconChevron() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 10 8l-4 4.5" />
    </svg>
  )
}

function IconFileDoc() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M9.5 1.5V4.5h3" />
      <path d="M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Score badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center justify-center h-6 min-w-[2.25rem] px-2 rounded-full text-[11px] font-mono font-semibold tabular-nums shrink-0 bg-surface-2 text-ink-3">
        —
      </span>
    )
  }
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

// ---------------------------------------------------------------------------
// Recomendación pill
// ---------------------------------------------------------------------------

function RecPill({ score }: { score: number | null }) {
  if (score === null) return null
  const { label, cls } =
    score >= 70
      ? { label: 'Participar', cls: 'bg-ochre-dim text-ochre' }
      : score >= 40
        ? { label: 'Revisar', cls: 'bg-amber-dim text-amber' }
        : { label: 'No participar', cls: 'bg-terracotta-dim text-terracotta' }
  return (
    <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 ${cls}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="rounded-[16px] border border-border-subtle p-6 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 bg-surface-2 rounded w-48" />
          <div className="h-3 bg-surface-2 rounded w-24" />
        </div>
        <div className="h-8 bg-surface-2 rounded-[10px] w-24" />
      </div>
      <div className="space-y-3 pt-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-9 bg-surface-2 rounded-full" />
            <div className="h-5 w-16 bg-surface-2 rounded-full" />
            <div className="h-4 bg-surface-2 rounded w-36 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pliego card
// ---------------------------------------------------------------------------

function PliegoCard({ group }: { group: PliegoGroup }) {
  return (
    <div className="rounded-[16px] border border-border-subtle p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ochre-dim flex items-center justify-center shrink-0 mt-0.5 [&_svg]:text-ochre">
            <IconFileDoc />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink leading-snug truncate">
              {group.pliegoNombre}
            </p>
            <p className="text-[12px] text-ink-3 mt-0.5">
              Analizado el {formatDate(group.analisisDate)}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/pliegos/${group.pliegoId}`}
          className="flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-ink-2 border border-border-subtle hover:bg-surface-2 hover:text-ink transition-colors duration-150"
        >
          Ver detalle
          <IconChevron />
        </Link>
      </div>

      <div className="space-y-0">
        {group.comparaciones.map((c, i) => (
          <div
            key={c.empresa_id}
            className={`flex items-center gap-3 py-2.5 ${i < group.comparaciones.length - 1 ? 'border-b border-border-subtle' : ''}`}
          >
            <ScoreBadge score={c.score} />
            <RecPill score={c.score} />
            <span className="flex-1 min-w-0 text-[13px] text-ink truncate">{c.empresa_nombre}</span>
            {c.nit && (
              <span className="hidden sm:block text-[11px] text-ink-3 font-mono tabular-nums shrink-0">
                {c.nit}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComparacionesPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [groups, setGroups] = useState<PliegoGroup[]>([])
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
    Promise.all([api.comparaciones.list(), api.pliegos.list()])
      .then(([comparaciones, pliegos]) => {
        const pliegosMap = new Map(pliegos.map((p) => [p.id, p]))
        setGroups(buildGroups(comparaciones, pliegosMap))
      })
      .catch(() => setError('No se pudieron cargar las comparaciones. Intenta de nuevo.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <div className="h-4 w-28 bg-surface-2 rounded animate-pulse" />
        </header>
        <div className="px-8 py-7 space-y-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">Comparaciones</h1>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        {error && (
          <div className="mb-5 px-4 py-3 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-sm">
              <p className="text-[14px] font-semibold text-ink mb-2">Sin comparaciones todavía</p>
              <p className="text-[13px] text-ink-2 leading-relaxed text-pretty">
                No hay comparaciones todavía. Analiza un pliego para ver el ranking de tus empresas.
              </p>
              <Link
                href="/dashboard/pliegos/nuevo"
                className="inline-flex items-center gap-1.5 mt-6 px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
              >
                Subir pliego
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {groups.map((group) => (
              <PliegoCard key={group.pliegoId} group={group} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
