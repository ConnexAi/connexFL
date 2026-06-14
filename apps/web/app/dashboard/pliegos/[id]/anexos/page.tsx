'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import { api } from '@/lib/api'
import type {
  PliegoDetail,
  ComparacionConEmpresa,
  AnexoGenerado,
  AnexosEstado,
} from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const ACCEPT_PLANTILLAS = ['.docx', '.xlsx', '.pdf']
const MAX_POLL_ATTEMPTS = 20
const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

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

function IconSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      className="animate-spin shrink-0">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5"
        strokeDasharray="63" strokeDashoffset="47" />
    </svg>
  )
}

function IconCheckSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5 6 12l7.5-8" />
    </svg>
  )
}

function IconWarn() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5 1.5 13.5h13L8 2.5Z" />
      <path d="M8 6.5v3M8 11.5v.5" strokeLinecap="round" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v8M5.5 7.5 8 10l2.5-2.5" />
      <path d="M2.5 12v1a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 13.5 13v-1" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Score badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const bg = score >= 70 ? '#DCFCE7' : score >= 50 ? '#FEF9C3' : '#FEE2E2'
  const color = score >= 70 ? '#15803D' : score >= 50 ? '#854D0E' : '#DC2626'
  return (
    <span
      className="inline-flex items-center justify-center h-6 min-w-[2.25rem] px-2 rounded-full text-[12px] shrink-0"
      style={{ ...OF, fontWeight: 600, background: bg, color }}
    >
      {score}
    </span>
  )
}

function RecomendacionBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center h-[20px] px-2 rounded-[5px] text-[11px] bg-[#F3F4F6] text-[#6B7280]"
        style={{ ...OF, fontWeight: 600 }}>
        Sin evaluar
      </span>
    )
  }
  if (score >= 70) {
    return (
      <span className="inline-flex items-center h-[20px] px-2 rounded-[5px] text-[11px] bg-[#DCFCE7] text-[#15803D]"
        style={{ ...OF, fontWeight: 600 }}>
        Recomendado · Score: {score}
      </span>
    )
  }
  if (score >= 50) {
    return (
      <span className="inline-flex items-center h-[20px] px-2 rounded-[5px] text-[11px] bg-[#FEF9C3] text-[#854D0E]"
        style={{ ...OF, fontWeight: 600 }}>
        Aceptable · Score: {score}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center h-[20px] px-2 rounded-[5px] text-[11px] bg-[#FEE2E2] text-[#DC2626]"
      style={{ ...OF, fontWeight: 600 }}>
      No recomendado · Score: {score}
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
// Anexo card
// ---------------------------------------------------------------------------

interface AnexoCardProps {
  anexo: AnexoGenerado
  idx: number
  pliegoId: string
  empresaId: string
}

function AnexoCard({ anexo, idx, pliegoId, empresaId }: AnexoCardProps) {
  const completados = anexo.reemplazos.filter((r) => r.encontrado)
  const downloadUrl = `${API}/api/anexos/descargar/${pliegoId}/${empresaId}/${idx}`

  return (
    <div className="rounded-[16px] border border-border-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle bg-surface">
        <h3 className="text-[14px] text-[#111827] truncate" style={{ ...OF, fontWeight: 600 }}>{anexo.nombre}</h3>
      </div>

      <div className="p-5 space-y-4">
        {completados.length > 0 && (
          <div>
            <p className="text-[12px] text-[#854D0E] uppercase tracking-wide mb-2"
              style={{ ...OF, fontWeight: 600 }}>
              Campos completados ({completados.length})
            </p>
            <ul className="space-y-1.5">
              {completados.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px]">
                  <span className="mt-0.5 text-[#15803D] shrink-0"><IconCheckSmall /></span>
                  <span className="text-[#6B7280] shrink-0" style={OF}>{r.campo_original}</span>
                  <span className="text-[#9CA3AF] shrink-0">→</span>
                  <span className="text-[#111827] break-all" style={OF}>{r.valor_nuevo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {anexo.campos_pendientes.length > 0 && (
          <div>
            <p className="text-[12px] text-[#854D0E] uppercase tracking-wide mb-2"
              style={{ ...OF, fontWeight: 600 }}>
              Pendiente de completar ({anexo.campos_pendientes.length})
            </p>
            <ul className="space-y-1">
              {anexo.campos_pendientes.map((campo, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]" style={OF}>
                  <span className="mt-0.5 text-[#854D0E] shrink-0"><IconWarn /></span>
                  {campo}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-1">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[13px] border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors text-[#374151]"
            style={{ ...OF, fontWeight: 600 }}
          >
            <IconDownload />
            Descargar .docx
          </a>
        </div>
      </div>
    </div>
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

  const [anexosData, setAnexosData] = useState<AnexosEstado | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session || !id) return
    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const [p, c] = await Promise.all([api.pliegos.get(id), api.comparaciones.list({ pliegoId: id })])
        if (cancelled) return
        setPliego(p)
        setComparaciones(c)

        // Pick empresa: prefer URL param, then best score (regardless of threshold)
        let empresaId = initialEmpresaId
        if (!empresaId && c.length > 0) {
          const best = c.reduce((top, cur) =>
            (cur.score ?? 0) > (top.score ?? 0) ? cur : top
          )
          empresaId = best.empresa_id
        }
        if (empresaId) {
          setSelectedEmpresaId(empresaId)
          try {
            const data = await api.anexos.get(id, empresaId)
            if (cancelled) return
            setAnexosData(data)
            if (data.estado_anexos === 'procesando') setIsPolling(true)
          } catch {
            // No anexos yet — ok
          }
        }
      } catch (err) {
        if (!cancelled) console.error(err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [session, id, initialEmpresaId])

  useEffect(() => {
    if (!isPolling || !selectedEmpresaId || !id) return
    pollCountRef.current = 0
    const pliegoId = id
    const empresaId = selectedEmpresaId

    const interval = setInterval(() => {
      pollCountRef.current += 1
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        setIsPolling(false)
        setPollError('Tiempo de espera agotado. El procesamiento tardó demasiado. Intenta de nuevo.')
        return
      }
      api.anexos.get(pliegoId, empresaId)
        .then((data) => {
          setAnexosData(data)
          if (data.estado_anexos === 'listo' || data.estado_anexos === 'error') {
            setIsPolling(false)
          }
        })
        .catch(console.error)
    }, 3000)

    return () => clearInterval(interval)
  }, [isPolling, selectedEmpresaId, id])

  // When empresa changes, reload its anexos state
  async function handleSelectEmpresa(empresaId: string) {
    setSelectedEmpresaId(empresaId)
    setAnexosData(null)
    setIsPolling(false)
    try {
      const data = await api.anexos.get(id, empresaId)
      setAnexosData(data)
      if (data.estado_anexos === 'procesando') setIsPolling(true)
    } catch {
      // No record yet
    }
  }

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
      setIsPolling(true)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Error al generar los anexos.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (sessionPending || isLoading) return <PageSkeleton />
  if (!session) return null

  const selectedEmpresa = comparaciones.find((c) => c.empresa_id === selectedEmpresaId)
  const pliegoNombre = pliego?.nombre ?? 'Pliego'
  const licitacionHref = pliego?.licitacion_id
    ? `/dashboard/licitaciones/${pliego.licitacion_id}`
    : '/dashboard/licitaciones'
  const canGenerar = !!selectedEmpresaId && plantillas.length > 0 && !isGenerating

  const view: 'listo' | 'procesando' | 'form' =
    anexosData?.estado_anexos === 'listo' ? 'listo' :
    isPolling ? 'procesando' :
    'form'

  const anexosGenerados = anexosData?.anexos_generados ?? []
  const totalReemplazados = anexosGenerados.reduce(
    (sum, a) => sum + a.reemplazos.filter((r) => r.encontrado).length, 0
  )
  const totalPendientes = anexosGenerados.reduce(
    (sum, a) => sum + a.campos_pendientes.length, 0
  )

  return (
    <>
      {/* Breadcrumb */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/licitaciones"
          className="flex items-center gap-1 text-[14px] text-[#374151] hover:text-[#111827] transition-colors duration-150 shrink-0"
          style={OF}
        >
          <IconBack />
          Licitaciones
        </Link>
        <span className="text-[#E8ECF0]" aria-hidden="true">/</span>
        <Link
          href={licitacionHref}
          className="text-[14px] text-[#374151] hover:text-[#111827] transition-colors duration-150 truncate max-w-[180px]"
          style={OF}
        >
          {pliegoNombre}
        </Link>
        <span className="text-[#E8ECF0]" aria-hidden="true">/</span>
        <span className="text-[14px] text-[#111827]" style={{ ...OF, fontWeight: 600 }}>Generar Anexos</span>
      </header>

      <div className="flex-1 px-8 py-7 overflow-auto">

        {pollError && (
          <div className="max-w-2xl mb-5 px-4 py-3 rounded-[10px] bg-[#FEE2E2] border border-[#DC2626]/20 text-[14px] text-[#DC2626]" style={OF}>
            {pollError}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* LISTO — resultados                                                 */}
        {/* ------------------------------------------------------------------ */}
        {view === 'listo' && selectedEmpresaId && (
          <div className="max-w-2xl space-y-5">
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 rounded-[12px] bg-[#FEF9C3] border border-[#854D0E]/20">
              <span className="text-[14px] text-[#854D0E]" style={{ ...OF, fontWeight: 600 }}>
                {anexosGenerados.length}{' '}
                {anexosGenerados.length === 1 ? 'anexo generado' : 'anexos generados'}
              </span>
              <span className="text-[#854D0E]/30 select-none">·</span>
              <span className="text-[13px] text-[#854D0E]/80" style={OF}>{totalReemplazados} campos completados</span>
              <span className="text-[#854D0E]/30 select-none">·</span>
              <span className="text-[13px] text-[#854D0E]" style={OF}>{totalPendientes} pendientes</span>
            </div>

            {anexosGenerados.map((anexo, i) => (
              <AnexoCard
                key={i}
                anexo={anexo}
                idx={i}
                pliegoId={id}
                empresaId={selectedEmpresaId}
              />
            ))}

            <div className="pb-4">
              <Link
                href={licitacionHref}
                className="flex items-center gap-1 text-[14px] text-[#374151] hover:text-[#111827] transition-colors duration-150"
                style={OF}
              >
                <IconBack />
                Volver a la licitación
              </Link>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PROCESANDO — spinner                                               */}
        {/* ------------------------------------------------------------------ */}
        {view === 'procesando' && (
          <div className="max-w-2xl">
            <div className="rounded-[16px] border border-border-subtle p-12 flex flex-col items-center gap-4 text-center">
              <div className="text-terracotta">
                <IconSpinner size={32} />
              </div>
              <p className="text-[15px] text-[#111827]" style={{ ...OF, fontWeight: 600 }}>
                Claude está procesando los anexos...
              </p>
              <p className="text-[14px] text-[#6B7280] max-w-sm leading-relaxed" style={OF}>
                Analizando las plantillas y completando los campos con el perfil de la empresa y los datos del proceso.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* FORM — subir plantillas                                            */}
        {/* ------------------------------------------------------------------ */}
        {view === 'form' && (
          <div className="max-w-2xl space-y-6">

            {/* Empresa seleccionada */}
            <section className="rounded-[16px] border border-border-subtle p-6">
              <h2 className="text-[15px] text-[#111827] mb-4" style={{ ...OF, fontWeight: 600 }}>Empresa</h2>

              {selectedEmpresa ? (
                <div className="flex items-center gap-3 p-3.5 rounded-[12px] bg-surface border border-border-subtle">
                  <div className="w-9 h-9 rounded-[8px] bg-[#F3F4F6] flex items-center justify-center shrink-0">
                    <span style={{ ...OF, fontWeight: 700, fontSize: 12, color: '#374151', lineHeight: 1 }}>
                      {selectedEmpresa.empresa_nombre
                        .split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-[#111827] truncate" style={{ ...OF, fontWeight: 600 }}>
                      {selectedEmpresa.empresa_nombre}
                    </p>
                    <p className="text-[12px] text-[#6B7280] date-caption">{selectedEmpresa.nit}</p>
                  </div>
                  <RecomendacionBadge score={selectedEmpresa.score} />
                  {comparaciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEmpresaId(null)}
                      className="text-[13px] text-[#6B7280] hover:text-[#374151] transition-colors duration-150 shrink-0"
                      style={OF}
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              ) : comparaciones.length === 0 ? (
                <p className="text-[14px] text-[#6B7280]" style={OF}>
                  No hay empresas comparadas para este pliego.{' '}
                  <Link href={licitacionHref} className="text-terracotta hover:text-terracotta-hover transition-colors duration-150">
                    Volver a la licitación
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[13px] text-[#6B7280] mb-3" style={OF}>
                    Selecciona la empresa para la que deseas generar los anexos.
                  </p>
                  {comparaciones.map((c) => (
                    <button
                      key={c.empresa_id}
                      type="button"
                      onClick={() => handleSelectEmpresa(c.empresa_id)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-[12px] bg-surface border border-border-subtle hover:border-border hover:bg-surface-2 transition-colors duration-150 text-left"
                    >
                      <div className="w-9 h-9 rounded-[8px] bg-[#F3F4F6] flex items-center justify-center shrink-0">
                        <span style={{ ...OF, fontWeight: 700, fontSize: 12, color: '#374151', lineHeight: 1 }}>
                          {c.empresa_nombre.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#111827] truncate" style={{ ...OF, fontWeight: 600 }}>{c.empresa_nombre}</p>
                        <p className="text-[12px] text-[#6B7280] date-caption">{c.nit}</p>
                      </div>
                      <RecomendacionBadge score={c.score} />
                      <ScoreBadge score={c.score} />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Plantillas */}
            <section className="rounded-[16px] border border-border-subtle p-6">
              <h2 className="text-[15px] text-[#111827] mb-1" style={{ ...OF, fontWeight: 600 }}>Plantillas de la entidad</h2>
              <p className="text-[13px] text-[#6B7280] mb-4" style={OF}>
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

            {generateError && (
              <div className="px-4 py-3 rounded-[10px] bg-[#FEE2E2] border border-[#DC2626]/20 text-[14px] text-[#DC2626]" style={OF}>
                {generateError}
              </div>
            )}

            <div className="flex items-center gap-3 pb-4">
              <button
                type="button"
                onClick={handleGenerar}
                disabled={!canGenerar}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[14px] bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ ...OF, fontWeight: 600 }}
              >
                {isGenerating ? (
                  <>
                    <IconSpinner />
                    Claude está analizando las plantillas...
                  </>
                ) : (
                  'Generar anexos'
                )}
              </button>
              <Link
                href={licitacionHref}
                className="px-4 py-2.5 rounded-[10px] text-[14px] text-[#374151] hover:text-[#111827] hover:bg-surface-2 transition-colors duration-150"
                style={OF}
              >
                Cancelar
              </Link>
            </div>

          </div>
        )}

      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function AnexosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnexosContent />
    </Suspense>
  )
}
