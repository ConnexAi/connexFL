'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import { api } from '@/lib/api'
import type { PliegoDetail, EstadoPliego, ComparacionConEmpresa } from '@/lib/types'
import { ChevronLeft, FileText, Download, AlertTriangle, Calendar } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const ACCEPT_FILES = ['.pdf', '.doc', '.docx', '.xlsx', '.xls']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

const estadoMap: Record<EstadoPliego, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-surface-2 text-ink-3' },
  analizando: { label: 'Analizando', cls: 'bg-amber-dim text-amber' },
  listo:      { label: 'Listo',      cls: 'bg-success-dim text-success' },
  error:      { label: 'Error',      cls: 'bg-terracotta-dim text-terracotta' },
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70 ? 'bg-success-dim text-success'
    : score >= 40 ? 'bg-amber-dim text-amber'
    : 'bg-terracotta-dim text-terracotta'
  return (
    <span className={`inline-flex items-center justify-center h-7 min-w-[2.5rem] px-2.5 rounded-full text-[12px] font-mono font-semibold tabular-nums shrink-0 ${cls}`}>
      {score}
    </span>
  )
}

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

  const [comparaciones, setComparaciones] = useState<ComparacionConEmpresa[]>([])
  const [comparLoading, setComparLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedEmpresas, setSelectedEmpresas] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session || !id) return
    setIsLoading(true)
    fetch(`${API}/api/pliegos/${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 404) { router.replace('/dashboard/pliegos'); return }
        if (!res.ok) throw new Error(`${res.status}`)
        setPliego(await res.json() as PliegoDetail)
      })
      .catch(() => setFetchError('No se pudo cargar el pliego.'))
      .finally(() => setIsLoading(false))
  }, [session, id, router])

  useEffect(() => {
    if (!pliego || pliego.estado !== 'listo') return
    setComparLoading(true)
    api.comparaciones.list(id)
      .then(setComparaciones)
      .catch(console.error)
      .finally(() => setComparLoading(false))
  }, [pliego, id])

  async function handleUploadFiles() {
    if (uploadFiles.length === 0) return
    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    const formData = new FormData()
    uploadFiles.forEach((f) => formData.append('archivos', f))

    try {
      const res = await fetch(`${API}/api/pliegos/${id}/archivos`, {
        method: 'POST', credentials: 'include', body: formData,
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

  function toggleEmpresa(empresaId: string) {
    setSelectedEmpresas((prev) => {
      const next = new Set(prev)
      next.has(empresaId) ? next.delete(empresaId) : next.add(empresaId)
      return next
    })
  }

  if (sessionPending || isLoading) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-14 bg-bg border-b border-border shrink-0">
          <div className="h-4 w-48 bg-border rounded animate-pulse" />
        </header>
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1280px] mx-auto px-8 py-8">
            <div className="grid grid-cols-2 gap-8">
              {[0, 1].map((i) => <div key={i} className="bg-surface rounded-2xl border border-border h-64 animate-pulse" />)}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  if (fetchError || !pliego) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-14 bg-bg border-b border-border shrink-0">
          <Link href="/dashboard/pliegos" className="flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink transition-colors">
            <ChevronLeft size={14} />Pliegos
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] text-ink-2 mb-4">{fetchError ?? 'Pliego no encontrado.'}</p>
            <Link href="/dashboard/pliegos" className="text-[13px] text-terracotta hover:text-terracotta-hover transition-colors">
              Volver a pliegos
            </Link>
          </div>
        </div>
      </>
    )
  }

  const { label: estadoLabel, cls: estadoCls } = estadoMap[pliego.estado]
  const archivos = pliego.archivos_path ?? []

  return (
    <>
      {/* Breadcrumb */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-14 bg-bg border-b border-border shrink-0">
        <Link href="/dashboard/pliegos" className="flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink transition-colors">
          <ChevronLeft size={14} />
          Pliegos
        </Link>
        <span className="text-border" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink truncate max-w-[280px]">{pliego.nombre}</span>
      </header>

      {/* 50/50 layout */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-8 py-8">
          <div className="grid grid-cols-2 gap-8 items-start">

            {/* Left: Info + Documents */}
            <div className="space-y-6">
              {/* Info card */}
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-ochre-dim flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-ochre" />
                    </div>
                    <div>
                      <h1 className="text-[15px] font-bold text-ink leading-snug">{pliego.nombre}</h1>
                      {pliego.entidad && (
                        <p className="text-[12px] text-ink-3 mt-0.5">{pliego.entidad}</p>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${estadoCls}`}>
                    {estadoLabel}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {pliego.secop_id && (
                    <div>
                      <dt className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-0.5">ID SECOP II</dt>
                      <dd className="text-[13px] text-ink font-mono">{pliego.secop_id}</dd>
                    </div>
                  )}
                  {pliego.fecha_limite && (
                    <div>
                      <dt className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-0.5">Fecha límite</dt>
                      <dd className="flex items-center gap-1 text-[13px] text-ink">
                        <Calendar size={12} className="text-ink-3" />
                        {formatDate(pliego.fecha_limite)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-0.5">Subido</dt>
                    <dd className="text-[13px] text-ink">{formatDate(pliego.created_at)}</dd>
                  </div>
                </dl>
              </div>

              {/* Documents */}
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <h2 className="text-[14px] font-semibold text-ink mb-4">Documentos</h2>
                {archivos.length > 0 && (
                  <ul className="space-y-1.5 mb-4" role="list">
                    {archivos.map((path, i) => (
                      <li key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-bg border border-border">
                        <FileText size={13} className="text-ink-3 shrink-0" />
                        <span className="flex-1 min-w-0 text-[12px] text-ink truncate">{basename(path)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="space-y-3">
                  <p className="text-[11px] text-ink-3">Agrega más documentos a este pliego.</p>
                  <DropZone accept={ACCEPT_FILES} multiple onFiles={setUploadFiles} isLoading={isUploading} />
                  {uploadError && <p className="text-[12px] text-terracotta">{uploadError}</p>}
                  {uploadSuccess && <p className="text-[12px] text-success">Archivos subidos correctamente.</p>}
                  {uploadFiles.length > 0 && !isUploading && (
                    <button
                      type="button"
                      onClick={handleUploadFiles}
                      className="px-4 py-2.5 rounded-lg text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
                    >
                      Subir archivos
                    </button>
                  )}
                </div>
              </div>

              {/* Ranking */}
              {pliego.estado === 'listo' && (
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] font-semibold text-ink">Ranking de empresas</h2>
                    {selectedEmpresas.size > 0 && (
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
                      >
                        Generar anexos ({selectedEmpresas.size})
                      </button>
                    )}
                  </div>
                  {comparLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border">
                          <div className="w-4 h-4 bg-border rounded animate-pulse shrink-0" />
                          <div className="flex-1 h-4 bg-border rounded animate-pulse" />
                          <div className="w-14 h-6 bg-border rounded-full animate-pulse" />
                          <div className="w-9 h-6 bg-border rounded-full animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : comparaciones.length === 0 ? (
                    <p className="text-[13px] text-ink-3">Las comparaciones se calcularán automáticamente.</p>
                  ) : (
                    <div>
                      {comparaciones.map((c) => {
                        const score = c.score ?? 0
                        const { recLabel, recCls } =
                          score >= 70
                            ? { recLabel: 'Participar', recCls: 'bg-success-dim text-success' }
                            : score >= 40
                              ? { recLabel: 'Revisar', recCls: 'bg-amber-dim text-amber' }
                              : { recLabel: 'No participar', recCls: 'bg-terracotta-dim text-terracotta' }
                        const isExpanded = expandedId === c.empresa_id

                        return (
                          <div key={c.empresa_id} className="border-b border-border-subtle last:border-0">
                            <div className="flex items-center gap-3 py-3">
                              <input
                                type="checkbox"
                                id={`empresa-${c.empresa_id}`}
                                checked={selectedEmpresas.has(c.empresa_id)}
                                onChange={() => toggleEmpresa(c.empresa_id)}
                                className="accent-terracotta shrink-0"
                              />
                              <label htmlFor={`empresa-${c.empresa_id}`} className="flex-1 min-w-0 text-[13px] font-medium text-ink cursor-pointer truncate">
                                {c.empresa_nombre}
                              </label>
                              <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 ${recCls}`}>
                                {recLabel}
                              </span>
                              <ScoreBadge score={score} />
                              {c.justificacion && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : c.empresa_id)}
                                  className="text-[11px] text-ink-3 hover:text-ink-2 whitespace-nowrap transition-colors shrink-0"
                                >
                                  {isExpanded ? 'Ocultar' : 'Ver más'}
                                </button>
                              )}
                              {score >= 40 && (
                                <Link
                                  href={`/dashboard/pliegos/${id}/anexos?empresaId=${c.empresa_id}`}
                                  className="text-[11px] font-medium text-terracotta hover:text-terracotta-hover whitespace-nowrap shrink-0"
                                >
                                  Anexos →
                                </Link>
                              )}
                            </div>
                            {isExpanded && c.justificacion && (
                              <div className="pb-3 pl-7 pr-2">
                                <p className="text-[12px] text-ink-2 leading-relaxed">{c.justificacion}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Analysis */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sticky top-[72px] max-h-[calc(100vh-120px)] overflow-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[14px] font-semibold text-ink">Análisis del pliego</h2>
                {pliego.estado === 'listo' && (
                  <a
                    href={`${API}/api/pliegos/${id}/analisis-docx`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-ink-2 hover:text-ink hover:bg-bg transition-colors"
                  >
                    <Download size={13} />
                    .docx
                  </a>
                )}
              </div>

              {pliego.estado === 'listo' && pliego.analisis ? (
                <div className="space-y-5">
                  <div className="bg-bg rounded-xl p-5">
                    <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Resumen</p>
                    <p className="text-[13px] text-ink-2 leading-relaxed">{pliego.analisis.resumen}</p>
                  </div>

                  {pliego.analisis.requisitos_habilitantes.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink mb-2">Requisitos habilitantes</p>
                      <ul className="space-y-1.5">
                        {pliego.analisis.requisitos_habilitantes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12px] text-ink-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-terracotta mt-1.5 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pliego.analisis.criterios_ponderacion.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink mb-3">Criterios de ponderación</p>
                      <div className="space-y-2">
                        {pliego.analisis.criterios_ponderacion.map((item, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="text-ink-2">{item.criterio}</span>
                              <span className="font-mono font-semibold text-ochre tabular-nums">{item.peso}%</span>
                            </div>
                            <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                              <div
                                className="h-full bg-ochre rounded-full"
                                style={{ width: `${Math.min(item.peso, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pliego.analisis.fechas_clave.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink mb-2">Fechas clave</p>
                      <div className="space-y-1">
                        {pliego.analisis.fechas_clave.map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-border-subtle last:border-0">
                            <span className="text-[12px] text-ink-2">{item.evento}</span>
                            <span className="text-[11px] font-mono text-ink-3 shrink-0">{item.fecha}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pliego.analisis.inconsistencias.length > 0 && (
                    <div className="rounded-xl bg-terracotta-dim border border-terracotta/20 p-4 space-y-2">
                      <p className="text-[12px] font-semibold text-terracotta">Inconsistencias detectadas</p>
                      {pliego.analisis.inconsistencias.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle size={13} className="text-terracotta shrink-0 mt-0.5" />
                          <p className="text-[12px] text-terracotta leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : pliego.estado === 'analizando' ? (
                <div className="px-4 py-4 rounded-xl bg-amber-dim border border-amber/20 text-[13px] text-amber leading-relaxed">
                  El pliego está siendo analizado. Esto puede tomar unos minutos.
                </div>
              ) : pliego.estado === 'pendiente' ? (
                <div className="px-4 py-4 rounded-xl bg-bg border border-border text-[13px] text-ink-2 leading-relaxed">
                  El análisis comenzará automáticamente una vez procesado.
                </div>
              ) : pliego.estado === 'error' ? (
                <div className="px-4 py-4 rounded-xl bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta leading-relaxed">
                  Ocurrió un error al analizar el pliego. Contacta al administrador.
                </div>
              ) : null}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
