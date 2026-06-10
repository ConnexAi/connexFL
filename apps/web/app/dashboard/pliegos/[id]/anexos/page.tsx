'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import { api } from '@/lib/api'
import type { PliegoDetail, ComparacionConEmpresa } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const ACCEPT_PLANTILLAS = ['.docx', '.xlsx', '.pdf']

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5 6 8l4 4.5" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      className="animate-spin shrink-0">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
        strokeDasharray="63" strokeDashoffset="47" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5 6 12l7.5-8" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Score badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
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
// Skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <div className="h-4 w-64 bg-surface-2 rounded animate-pulse" />
      </header>
      <div className="flex-1 px-8 py-8 overflow-auto">
        <div className="max-w-2xl space-y-6 animate-pulse">
          <div className="rounded-[16px] border border-border-subtle p-6 space-y-3">
            <div className="h-4 bg-surface-2 rounded w-32" />
            <div className="h-14 bg-surface-2 rounded-[12px]" />
          </div>
          <div className="rounded-[16px] border border-border-subtle p-6 space-y-3">
            <div className="h-4 bg-surface-2 rounded w-40" />
            <div className="h-28 bg-surface-2 rounded-[16px]" />
          </div>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main content — needs useSearchParams so lives inside Suspense
// ---------------------------------------------------------------------------

function AnexosContent() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const id = params.id
  const initialEmpresaId = searchParams.get('empresaId')

  const [pliego, setPliego] = useState<PliegoDetail | null>(null)
  const [comparaciones, setComparaciones] = useState<ComparacionConEmpresa[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(initialEmpresaId)
  const [plantillas, setPlantillas] = useState<File[]>([])

  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateSuccess, setGenerateSuccess] = useState(false)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session || !id) return
    setIsLoading(true)
    Promise.all([api.pliegos.get(id), api.comparaciones.list(id)])
      .then(([p, c]) => {
        setPliego(p)
        setComparaciones(c)
        if (!initialEmpresaId && c.length > 0) {
          const best = c.reduce((top, cur) =>
            (cur.score ?? 0) > (top.score ?? 0) ? cur : top
          )
          if ((best.score ?? 0) >= 40) setSelectedEmpresaId(best.empresa_id)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [session, id, initialEmpresaId])

  async function handleGenerar() {
    if (!selectedEmpresaId || plantillas.length === 0) return
    setIsGenerating(true)
    setGenerateError(null)

    const formData = new FormData()
    formData.append('pliego_id', id)
    formData.append('empresa_id', selectedEmpresaId)
    plantillas.forEach((f) => formData.append('plantillas', f))

    try {
      const res = await fetch(`${API}/api/anexos/generar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
      }
      setGenerateSuccess(true)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Error al generar los anexos.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (sessionPending || isLoading) return <PageSkeleton />
  if (!session) return null

  const selectedEmpresa = comparaciones.find((c) => c.empresa_id === selectedEmpresaId)
  const elegibles = comparaciones.filter((c) => (c.score ?? 0) >= 40)
  const pliegoNombre = pliego?.nombre ?? 'Pliego'
  const canGenerar = !!selectedEmpresaId && plantillas.length > 0 && !isGenerating

  return (
    <>
      {/* Topbar breadcrumb */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/pliegos"
          className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150 shrink-0"
        >
          <IconBack />
          Pliegos
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <Link
          href={`/dashboard/pliegos/${id}`}
          className="text-[13px] text-ink-2 hover:text-ink transition-colors duration-150 truncate max-w-[180px]"
        >
          {pliegoNombre}
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink">Generar Anexos</span>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        <div className="max-w-2xl space-y-6">

          {/* Empresa seleccionada */}
          <section className="rounded-[16px] border border-border-subtle p-6">
            <h2 className="text-[14px] font-semibold text-ink mb-4">Empresa</h2>

            {selectedEmpresa ? (
              <div className="flex items-center gap-3 p-3.5 rounded-[12px] bg-surface border border-border-subtle">
                <div className="w-9 h-9 rounded-full bg-terracotta-dim flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-semibold text-terracotta select-none">
                    {selectedEmpresa.empresa_nombre
                      .split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-ink truncate">
                    {selectedEmpresa.empresa_nombre}
                  </p>
                  <p className="text-[12px] text-ink-3 font-mono">{selectedEmpresa.nit}</p>
                </div>
                <ScoreBadge score={selectedEmpresa.score} />
                {elegibles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmpresaId(null)}
                    className="text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150 shrink-0"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            ) : elegibles.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                No hay empresas con score ≥ 40 para este pliego.{' '}
                <Link href={`/dashboard/pliegos/${id}`} className="text-terracotta hover:text-terracotta-hover transition-colors duration-150">
                  Volver al pliego
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[12px] text-ink-3 mb-3">
                  Selecciona la empresa para la que deseas generar los anexos.
                </p>
                {elegibles.map((c) => (
                  <button
                    key={c.empresa_id}
                    type="button"
                    onClick={() => setSelectedEmpresaId(c.empresa_id)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-[12px] bg-surface border border-border-subtle hover:border-border hover:bg-surface-2 transition-colors duration-150 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-terracotta-dim flex items-center justify-center shrink-0">
                      <span className="text-[12px] font-semibold text-terracotta select-none">
                        {c.empresa_nombre.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate">{c.empresa_nombre}</p>
                      <p className="text-[11px] text-ink-3 font-mono">{c.nit}</p>
                    </div>
                    <ScoreBadge score={c.score} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Plantillas de la entidad */}
          <section className="rounded-[16px] border border-border-subtle p-6">
            <h2 className="text-[14px] font-semibold text-ink mb-1">Plantillas de la entidad</h2>
            <p className="text-[12px] text-ink-3 mb-4">
              Generalmente los pliegos incluyen formatos numerados (Formato 1, Formato 2...). Sube los que correspondan a esta empresa.
            </p>
            <DropZone
              accept={ACCEPT_PLANTILLAS}
              multiple
              onFiles={setPlantillas}
              label="Sube las plantillas que publicó la entidad en el pliego"
              isLoading={isGenerating}
            />
          </section>

          {/* Errors */}
          {generateError && (
            <div className="px-4 py-3 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
              {generateError}
            </div>
          )}

          {/* Success state */}
          {generateSuccess ? (
            <section className="rounded-[16px] border border-ochre/30 bg-ochre-dim p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-ochre/20 flex items-center justify-center shrink-0 text-ochre mt-0.5">
                  <IconCheck />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ochre mb-1">Proceso iniciado</p>
                  <p className="text-[13px] text-ochre/80 leading-relaxed">
                    Claude está procesando las plantillas con el perfil de la empresa.
                    Los anexos completados estarán disponibles en unos momentos.
                  </p>
                  <Link
                    href={`/dashboard/pliegos/${id}`}
                    className="inline-flex items-center gap-1 mt-4 text-[13px] font-medium text-ochre hover:text-ochre/80 transition-colors duration-150"
                  >
                    Volver al pliego
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            /* Submit button */
            <div className="flex items-center gap-3 pb-4">
              <button
                type="button"
                onClick={handleGenerar}
                disabled={!canGenerar}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <IconSpinner />
                    Claude está llenando los formularios...
                  </>
                ) : (
                  'Generar anexos'
                )}
              </button>
              <Link
                href={`/dashboard/pliegos/${id}`}
                className="px-4 py-2.5 rounded-[10px] text-[13px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150"
              >
                Cancelar
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Page export — wraps content in Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------

export default function AnexosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnexosContent />
    </Suspense>
  )
}
