'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import type { PliegoDetail, EstadoPliego, EmpresaCompatible } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const ACCEPT_FILES = ['.pdf', '.doc', '.docx', '.xlsx', '.xls']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
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

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5 6 8l4 4.5" />
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-ink-3 shrink-0">
      <path d="M3.5 1.5h6l3 3v9.5a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" />
      <path d="M9.5 1.5V4.5h3" />
    </svg>
  )
}

function IconWarning() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-terracotta shrink-0 mt-0.5">
      <path d="M8 2.5 1.5 13.5h13L8 2.5Z" />
      <line x1="8" y1="7" x2="8" y2="9.5" />
      <circle cx="8" cy="11.5" r=".5" fill="currentColor" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Score badge
// ---------------------------------------------------------------------------

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-ochre-dim text-ochre'
      : score >= 40
        ? 'bg-amber-dim text-amber'
        : 'bg-terracotta-dim text-terracotta'
  return (
    <span className={`inline-flex items-center justify-center h-7 min-w-[2.5rem] px-2.5 rounded-full text-[12px] font-mono font-semibold tabular-nums shrink-0 ${cls}`}>
      {score}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="max-w-2xl space-y-8 animate-pulse">
      <div className="rounded-[16px] border border-border-subtle p-6 space-y-4">
        <div className="h-5 bg-surface-2 rounded w-64" />
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-surface-2 rounded w-14" />
              <div className="h-4 bg-surface-2 rounded w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[16px] border border-border-subtle p-6 space-y-3">
        <div className="h-4 bg-surface-2 rounded w-24" />
        <div className="h-3 bg-surface-2 rounded w-full" />
        <div className="h-3 bg-surface-2 rounded w-4/5" />
        <div className="h-3 bg-surface-2 rounded w-3/4" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Analysis sub-sections
// ---------------------------------------------------------------------------

function ListSection({ title, items, variant = 'default' }: {
  title: string
  items: string[]
  variant?: 'default' | 'warning'
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px]">
            {variant === 'warning' ? <IconWarning /> : (
              <span className="w-1.5 h-1.5 rounded-full bg-border mt-1.5 shrink-0" />
            )}
            <span className={variant === 'warning' ? 'text-terracotta' : 'text-ink-2 leading-relaxed'}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CriteriosTable({ items }: { items: { criterio: string; peso: number }[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink mb-2">Criterios de ponderación</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
            <span className="text-[13px] text-ink-2">{item.criterio}</span>
            <span className="text-[13px] font-mono tabular-nums text-ochre shrink-0">{item.peso}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FechasTable({ items }: { items: { evento: string; fecha: string }[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink mb-2">Fechas clave</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
            <span className="text-[13px] text-ink-2">{item.evento}</span>
            <span className="text-[12px] font-mono tabular-nums text-ink-3 shrink-0">{item.fecha}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PliegoDetailPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [pliego, setPliego] = useState<PliegoDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [selectedEmpresas, setSelectedEmpresas] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session || !id) return
    setIsLoading(true)
    fetch(`${API}/api/pliegos/${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 404) {
          router.replace('/dashboard/pliegos')
          return
        }
        if (!res.ok) throw new Error(`${res.status}`)
        const data: PliegoDetail = await res.json()
        setPliego(data)
      })
      .catch(() => setFetchError('No se pudo cargar el pliego. Intenta de nuevo.'))
      .finally(() => setIsLoading(false))
  }, [session, id, router])

  async function handleUploadFiles() {
    if (uploadFiles.length === 0) return
    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    const formData = new FormData()
    uploadFiles.forEach((f) => formData.append('archivos', f))

    try {
      const res = await fetch(`${API}/api/pliegos/${id}/archivos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
      }
      setUploadSuccess(true)
      setUploadFiles([])
      const updated: PliegoDetail = await fetch(`${API}/api/pliegos/${id}`, { credentials: 'include' }).then((r) => r.json())
      setPliego(updated)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir los archivos.')
    } finally {
      setIsUploading(false)
    }
  }

  function toggleEmpresa(id: string) {
    setSelectedEmpresas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (sessionPending || isLoading) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <div className="h-4 w-48 bg-surface-2 rounded animate-pulse" />
        </header>
        <div className="flex-1 px-8 py-8 overflow-auto">
          <DetailSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  if (fetchError || !pliego) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <Link href="/dashboard/pliegos" className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150">
            <IconBack />Pliegos
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="text-center">
            <p className="text-[14px] text-ink-2 mb-4">{fetchError ?? 'Pliego no encontrado.'}</p>
            <Link href="/dashboard/pliegos" className="text-[13px] text-terracotta hover:text-terracotta-hover transition-colors duration-150">
              Volver a pliegos
            </Link>
          </div>
        </div>
      </>
    )
  }

  const { label: estadoLabel, cls: estadoCls } = estadoMap[pliego.estado]
  const archivos = pliego.archivos_path ?? []
  const compatibles = pliego.empresas_compatibles ?? []

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/pliegos"
          className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150"
        >
          <IconBack />
          Pliegos
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink truncate max-w-[280px]">{pliego.nombre}</span>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        <div className="max-w-2xl space-y-7">

          {/* Summary section */}
          <section className="rounded-[16px] border border-border-subtle p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-[15px] font-semibold text-ink leading-snug">{pliego.nombre}</h2>
              <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${estadoCls}`}>
                {estadoLabel}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {pliego.entidad && (
                <div>
                  <dt className="text-[11px] font-medium text-ink-3 mb-0.5">Entidad</dt>
                  <dd className="text-[13px] text-ink">{pliego.entidad}</dd>
                </div>
              )}
              {pliego.secop_id && (
                <div>
                  <dt className="text-[11px] font-medium text-ink-3 mb-0.5">ID SECOP II</dt>
                  <dd className="text-[13px] text-ink font-mono">{pliego.secop_id}</dd>
                </div>
              )}
              {pliego.fecha_limite && (
                <div>
                  <dt className="text-[11px] font-medium text-ink-3 mb-0.5">Fecha límite</dt>
                  <dd className="text-[13px] text-ink">{formatDate(pliego.fecha_limite)}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-medium text-ink-3 mb-0.5">Subido</dt>
                <dd className="text-[13px] text-ink">{formatDate(pliego.created_at)}</dd>
              </div>
            </dl>
          </section>

          {/* Documents section */}
          <section className="rounded-[16px] border border-border-subtle p-6">
            <h3 className="text-[15px] font-semibold text-ink mb-4">Documentos</h3>
            {archivos.length > 0 ? (
              <ul className="space-y-1.5 mb-5" role="list">
                {archivos.map((path, i) => (
                  <li key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] bg-surface border border-border-subtle">
                    <IconFile />
                    <span className="flex-1 min-w-0 text-[13px] text-ink truncate">{basename(path)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3 mb-5">Sin documentos subidos.</p>
            )}
            <div className="space-y-3">
              <p className="text-[12px] text-ink-3">Agrega más documentos a este pliego.</p>
              <DropZone
                accept={ACCEPT_FILES}
                multiple
                onFiles={setUploadFiles}
                isLoading={isUploading}
              />
              {uploadError && <p className="text-[12px] text-terracotta">{uploadError}</p>}
              {uploadSuccess && <p className="text-[12px] text-ochre">Archivos subidos correctamente.</p>}
              {uploadFiles.length > 0 && !isUploading && (
                <button
                  type="button"
                  onClick={handleUploadFiles}
                  className="px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
                >
                  Subir archivos
                </button>
              )}
            </div>
          </section>

          {/* Analysis section */}
          {pliego.estado === 'listo' && pliego.analisis ? (
            <section className="rounded-[16px] border border-border-subtle p-6 space-y-5">
              <h3 className="text-[15px] font-semibold text-ink">Análisis del pliego</h3>
              <p className="text-[13px] text-ink-2 leading-relaxed">{pliego.analisis.resumen}</p>
              <ListSection
                title="Requisitos habilitantes"
                items={pliego.analisis.requisitos_habilitantes}
              />
              <CriteriosTable items={pliego.analisis.criterios_ponderacion} />
              <FechasTable items={pliego.analisis.fechas_clave} />
              {pliego.analisis.inconsistencias.length > 0 && (
                <div>
                  <p className="text-[13px] font-semibold text-ink mb-2">Inconsistencias detectadas</p>
                  <div className="rounded-[10px] bg-terracotta-dim border border-terracotta/20 p-4 space-y-2">
                    {pliego.analisis.inconsistencias.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <IconWarning />
                        <p className="text-[13px] text-terracotta leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : pliego.estado === 'analizando' ? (
            <div className="px-4 py-3.5 rounded-[10px] bg-amber-dim border border-amber/20 text-[13px] text-amber">
              El pliego está siendo analizado. Esto puede tomar unos minutos.
            </div>
          ) : pliego.estado === 'pendiente' ? (
            <div className="px-4 py-3.5 rounded-[10px] bg-surface border border-border-subtle text-[13px] text-ink-2">
              El pliego aún no ha sido procesado. El análisis comenzará automáticamente.
            </div>
          ) : pliego.estado === 'error' ? (
            <div className="px-4 py-3.5 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
              Ocurrió un error al analizar el pliego. Contacta al administrador.
            </div>
          ) : null}

          {/* Compatible companies section */}
          {pliego.estado === 'listo' && (
            <section className="rounded-[16px] border border-border-subtle p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[15px] font-semibold text-ink">Empresas compatibles</h3>
                {selectedEmpresas.size > 0 && (
                  <button
                    type="button"
                    className="px-3.5 py-2 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
                  >
                    Generar anexos ({selectedEmpresas.size})
                  </button>
                )}
              </div>

              {compatibles.length === 0 ? (
                <p className="text-[13px] text-ink-3">
                  Las comparaciones se calcularán automáticamente cuando el análisis esté listo.
                </p>
              ) : (
                <div className="space-y-0">
                  {compatibles
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((c) => (
                      <div
                        key={c.empresa_id}
                        className="flex items-center gap-4 py-3.5 border-b border-border-subtle last:border-0"
                      >
                        <input
                          type="checkbox"
                          id={`empresa-${c.empresa_id}`}
                          checked={selectedEmpresas.has(c.empresa_id)}
                          onChange={() => toggleEmpresa(c.empresa_id)}
                          className="accent-terracotta shrink-0"
                        />
                        <label
                          htmlFor={`empresa-${c.empresa_id}`}
                          className="flex-1 min-w-0 text-[14px] font-medium text-ink cursor-pointer truncate"
                        >
                          {c.empresa_nombre}
                        </label>
                        <ScoreBadge score={c.score} />
                        <Link
                          href={`/dashboard/comparaciones?empresa=${c.empresa_id}&pliego=${id}`}
                          className="text-[12px] text-ink-3 hover:text-ink-2 whitespace-nowrap transition-colors duration-150"
                        >
                          Ver comparación
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </>
  )
}
