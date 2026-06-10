'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import type { AnalisisEmpresa, EmpresaDetail, EstadoEmpresa } from '@/lib/types'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Document definitions — 10 documentos esenciales de Ximena
// ---------------------------------------------------------------------------

interface DocDef {
  id: string
  label: string
  note?: string
  isImportant?: boolean
}

const ESSENTIAL_DOCS: DocDef[] = [
  { id: 'camara_comercio', label: 'Certificado de existencia y representación legal', note: 'Cámara de Comercio' },
  { id: 'cedula_representante', label: 'Cédula del representante legal y libreta militar' },
  { id: 'contraloria', label: 'Antecedentes Contraloría' },
  { id: 'procuraduria', label: 'Antecedentes Procuraduría' },
  { id: 'judiciales', label: 'Antecedentes judiciales' },
  { id: 'rut', label: 'RUT' },
  { id: 'rup', label: 'RUP — Registro Único de Proponentes', note: 'Descárgalo desde Cámara de Comercio en PDF' },
  { id: 'parafiscales', label: 'Certificado de parafiscales' },
  { id: 'sg_sst', label: 'Certificado SG-SST', note: 'ARL y Ministerio de Trabajo' },
]

const CUADRO_EXPERIENCIA: DocDef = {
  id: 'cuadro_experiencia',
  label: 'Cuadro de experiencia',
  note: 'Este documento define qué licitaciones puede ganar la empresa',
  isImportant: true,
}

const ALL_DOCS = [...ESSENTIAL_DOCS, CUADRO_EXPERIENCIA]
const INITIAL_PENDING: Record<string, File | null> = Object.fromEntries(ALL_DOCS.map((d) => [d.id, null]))

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

const estadoMap: Record<EstadoEmpresa, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-surface-2 text-ink-3' },
  procesando: { label: 'Procesando', cls: 'bg-amber-dim text-amber' },
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

function IconX() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// DocumentSlot
// ---------------------------------------------------------------------------

function DocumentSlot({
  doc,
  file,
  onChange,
}: {
  doc: DocDef
  file: File | null
  onChange: (f: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function pick(f: File | undefined) {
    if (f) onChange(f)
  }

  const loaded = file !== null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Subir: ${doc.label}`}
      className={[
        'rounded-[12px] border transition-colors duration-150 cursor-pointer select-none outline-none',
        'focus-visible:ring-1 focus-visible:ring-terracotta',
        loaded
          ? 'border-ochre bg-ochre-dim'
          : isDragging
            ? 'border-terracotta bg-terracotta-dim'
            : doc.isImportant
              ? 'border-ochre/40 bg-surface hover:border-ochre/70'
              : 'border-border-subtle bg-surface hover:border-border',
      ].join(' ')}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); pick(e.dataTransfer.files[0]) }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
        onClick={(e) => e.stopPropagation()}
      />

      <div className="p-3.5 min-h-[82px] flex flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[12px] font-medium leading-snug ${loaded ? 'text-ochre' : 'text-ink-2'}`}>
            {doc.label}
          </p>
          <div className="shrink-0 mt-0.5">
            {loaded ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null) }}
                className="text-ochre hover:opacity-60 transition-opacity duration-100"
                aria-label="Quitar archivo"
              >
                <IconX />
              </button>
            ) : doc.isImportant ? (
              <span className="inline-flex items-center h-4 px-2 rounded-full bg-ochre-dim text-ochre text-[10px] font-semibold whitespace-nowrap">
                Más importante
              </span>
            ) : null}
          </div>
        </div>

        <div>
          {loaded ? (
            <p className="text-[11px] text-ochre/70 truncate font-mono">{file.name}</p>
          ) : (
            <>
              {doc.note && (
                <p className="text-[11px] text-ink-3 leading-snug mb-1">{doc.note}</p>
              )}
              <p className="text-[11px] text-ink-3">
                {isDragging ? 'Suelta aquí' : 'Arrastra o haz clic · PDF'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Análisis helpers
// ---------------------------------------------------------------------------

function habBadge(h: AnalisisEmpresa['habilitacion_legal']): { label: string; cls: string } {
  if (h === 'habilitada') return { label: 'Habilitada', cls: 'bg-ochre-dim text-ochre' }
  if (h === 'inhabilitada') return { label: 'Inhabilitada', cls: 'bg-terracotta-dim text-terracotta' }
  return { label: 'Sin verificar', cls: 'bg-surface-2 text-ink-3' }
}

function nivelBadge(n: 'alto' | 'medio' | 'bajo'): { label: string; cls: string } {
  if (n === 'alto') return { label: 'Alto', cls: 'bg-ochre-dim text-ochre' }
  if (n === 'medio') return { label: 'Medio', cls: 'bg-amber-dim text-amber' }
  return { label: 'Bajo', cls: 'bg-terracotta-dim text-terracotta' }
}

function AnalisisSection({ analisis }: { analisis: AnalisisEmpresa }) {
  return (
    <div className="space-y-4">

      {/* 1. Resumen ejecutivo */}
      <section className="rounded-[16px] border border-border-subtle p-6">
        <h3 className="text-[14px] font-semibold text-ink mb-3">Resumen ejecutivo</h3>
        <p className="text-[13px] text-ink-2 leading-relaxed">{analisis.resumen_ejecutivo}</p>
      </section>

      {/* 2. Fortalezas y Debilidades */}
      <div className="grid grid-cols-2 gap-4">
        <section className="rounded-[16px] border border-border-subtle p-6">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Fortalezas</h3>
          {analisis.fortalezas.length > 0 ? (
            <ul className="space-y-2">
              {analisis.fortalezas.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <span className="text-ochre mt-0.5 leading-none shrink-0" aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-3">Sin información.</p>
          )}
        </section>
        <section className="rounded-[16px] border border-border-subtle p-6">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Debilidades</h3>
          {analisis.debilidades.length > 0 ? (
            <ul className="space-y-2">
              {analisis.debilidades.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-ink-2">
                  <span className="text-terracotta mt-0.5 leading-none shrink-0" aria-hidden="true">•</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-3">Sin información.</p>
          )}
        </section>
      </div>

      {/* 3. Tipos de contrato */}
      {analisis.tipos_contrato_recomendados.length > 0 && (
        <section className="rounded-[16px] border border-border-subtle p-6">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Tipos de contrato recomendados</h3>
          <div className="flex flex-wrap gap-2">
            {analisis.tipos_contrato_recomendados.map((tipo, i) => (
              <span key={i} className="inline-flex items-center h-7 px-3 rounded-full bg-surface-2 border border-border-subtle text-[12px] text-ink-2">
                {tipo}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 4. Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <section className="rounded-[16px] border border-border-subtle p-5 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] font-medium text-ink-3 mb-1.5">Años de experiencia</p>
          <p className="text-[32px] font-bold text-ochre font-mono tabular-nums leading-none">
            {analisis.anos_experiencia}
          </p>
        </section>
        <section className="rounded-[16px] border border-border-subtle p-5 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-[11px] font-medium text-ink-3">Habilitación legal</p>
          <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium ${habBadge(analisis.habilitacion_legal).cls}`}>
            {habBadge(analisis.habilitacion_legal).label}
          </span>
        </section>
        <section className="rounded-[16px] border border-border-subtle p-5 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-[11px] font-medium text-ink-3">Nivel financiero</p>
          <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium ${nivelBadge(analisis.indicadores_financieros.nivel).cls}`}>
            {nivelBadge(analisis.indicadores_financieros.nivel).label}
          </span>
          {analisis.indicadores_financieros.descripcion && (
            <p className="text-[11px] text-ink-3 leading-snug text-center max-w-[140px]">
              {analisis.indicadores_financieros.descripcion}
            </p>
          )}
        </section>
      </div>

      {/* 5. Contratos ejecutados */}
      {analisis.contratos_ejecutados.length > 0 && (
        <section className="rounded-[16px] border border-border-subtle p-6">
          <h3 className="text-[14px] font-semibold text-ink mb-4">
            Contratos ejecutados
            <span className="ml-2 text-[12px] font-normal font-mono text-ink-3 tabular-nums">
              {analisis.contratos_ejecutados.length}
            </span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2.5 pr-4 text-[11px] font-medium text-ink-3 w-[42%]">Descripción</th>
                  <th className="text-left pb-2.5 pr-4 text-[11px] font-medium text-ink-3">Entidad</th>
                  <th className="text-left pb-2.5 pr-4 text-[11px] font-medium text-ink-3 whitespace-nowrap">Valor aprox.</th>
                  <th className="text-left pb-2.5 text-[11px] font-medium text-ink-3">Año</th>
                </tr>
              </thead>
              <tbody>
                {analisis.contratos_ejecutados.map((c, i) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0">
                    <td className="py-2.5 pr-4 text-ink-2 align-top">{c.descripcion}</td>
                    <td className="py-2.5 pr-4 text-ink-3 align-top">{c.entidad}</td>
                    <td className="py-2.5 pr-4 text-ink-3 align-top font-mono tabular-nums whitespace-nowrap">{c.valor_aproximado}</td>
                    <td className="py-2.5 text-ink-3 align-top font-mono tabular-nums">{c.ano}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Capacidad técnica */}
      {analisis.capacidad_tecnica && (
        <section className="rounded-[16px] border border-border-subtle p-6">
          <h3 className="text-[14px] font-semibold text-ink mb-3">Capacidad técnica</h3>
          <p className="text-[13px] text-ink-2 leading-relaxed">{analisis.capacidad_tecnica}</p>
        </section>
      )}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="max-w-2xl space-y-8 animate-pulse">
      <div className="rounded-[16px] border border-border-subtle p-6 space-y-4">
        <div className="h-5 bg-surface-2 rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 bg-surface-2 rounded w-12" />
              <div className="h-4 bg-surface-2 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-[16px] border border-border-subtle p-6 space-y-3">
        <div className="h-4 bg-surface-2 rounded w-28" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 bg-surface-2 rounded" />
            <div className="h-3 bg-surface-2 rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmpresaDetailPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [empresa, setEmpresa] = useState<EmpresaDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>(INITIAL_PENDING)
  const [pendingOtherFiles, setPendingOtherFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session || !id) return
    setIsLoading(true)
    fetch(`${API}/api/empresas/${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 404) { router.replace('/dashboard/empresas'); return }
        if (!res.ok) throw new Error(`${res.status}`)
        const data: EmpresaDetail = await res.json()
        setEmpresa(data)
      })
      .catch(() => setFetchError('No se pudo cargar la empresa. Intenta de nuevo.'))
      .finally(() => setIsLoading(false))
  }, [session, id, router])

  const pendingCount = Object.values(pendingFiles).filter(Boolean).length + pendingOtherFiles.length

  function setPendingFile(docId: string, f: File | null) {
    setPendingFiles((prev) => ({ ...prev, [docId]: f }))
  }

  async function handleUpload() {
    if (pendingCount === 0) return
    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    const formData = new FormData()
    let idx = 0
    ALL_DOCS.forEach((doc) => {
      const f = pendingFiles[doc.id]
      if (f) {
        formData.append('archivos', f)
        formData.append(`tipo_documento_${idx}`, doc.id)
        idx++
      }
    })
    pendingOtherFiles.forEach((f) => formData.append('archivos', f))

    try {
      const res = await fetch(`${API}/api/empresas/${id}/archivos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
      }
      setUploadSuccess(true)
      setPendingFiles(INITIAL_PENDING)
      setPendingOtherFiles([])
      const updated: EmpresaDetail = await fetch(`${API}/api/empresas/${id}`, { credentials: 'include' }).then((r) => r.json())
      setEmpresa(updated)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al subir los archivos.')
    } finally {
      setIsUploading(false)
    }
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

  if (fetchError || !empresa) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <Link href="/dashboard/empresas" className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150">
            <IconBack />Empresas
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="text-center">
            <p className="text-[14px] text-ink-2 mb-4">{fetchError ?? 'Empresa no encontrada.'}</p>
            <Link href="/dashboard/empresas" className="text-[13px] text-terracotta hover:text-terracotta-hover transition-colors duration-150">
              Volver a empresas
            </Link>
          </div>
        </div>
      </>
    )
  }

  const { label: estadoLabel, cls: estadoCls } = estadoMap[empresa.estado]
  const archivos = empresa.archivos_path ?? []

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/empresas"
          className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150"
        >
          <IconBack />
          Empresas
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink truncate max-w-[240px]">{empresa.nombre}</span>
        <div className="flex-1" />
        <button className="px-3.5 py-2 rounded-[10px] text-[13px] text-ink-2 border border-border-subtle hover:text-ink hover:bg-surface-2 transition-colors duration-150">
          Editar
        </button>
      </header>

      <div className="flex-1 px-8 py-7 overflow-auto">
        <div className="max-w-2xl space-y-7">

          {/* Info */}
          <section className="rounded-[16px] border border-border-subtle p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <h2 className="text-[15px] font-semibold text-ink">{empresa.nombre}</h2>
              <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${estadoCls}`}>
                {estadoLabel}
              </span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <dt className="text-[11px] font-medium text-ink-3 mb-0.5">NIT</dt>
                <dd className="text-[13px] text-ink font-mono tabular-nums">{empresa.nit}</dd>
              </div>
              {empresa.sector && (
                <div>
                  <dt className="text-[11px] font-medium text-ink-3 mb-0.5">Sector</dt>
                  <dd className="text-[13px] text-ink">{empresa.sector}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-medium text-ink-3 mb-0.5">Registrada</dt>
                <dd className="text-[13px] text-ink">{formatDate(empresa.created_at)}</dd>
              </div>
            </dl>
          </section>

          {/* Documentos subidos */}
          {archivos.length > 0 && (
            <section className="rounded-[16px] border border-border-subtle p-6">
              <h3 className="text-[14px] font-semibold text-ink mb-4">
                Documentos subidos
                <span className="ml-2 text-[12px] font-normal font-mono text-ink-3 tabular-nums">
                  {archivos.length}
                </span>
              </h3>
              <ul className="space-y-1.5" role="list">
                {archivos.map((path, i) => (
                  <li key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] bg-surface border border-border-subtle">
                    <IconFile />
                    <span className="flex-1 min-w-0 text-[13px] text-ink truncate">{basename(path)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Agregar documentos */}
          <section className="rounded-[16px] border border-border-subtle p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h3 className="text-[14px] font-semibold text-ink">
                  {archivos.length === 0 ? 'Subir documentos' : 'Agregar documentos'}
                </h3>
                <p className="text-[12px] text-ink-3 mt-0.5">
                  Solo PDF. Selecciona el tipo de documento para cada slot.
                </p>
              </div>
              {pendingCount > 0 && (
                <span className="text-[12px] font-mono tabular-nums text-ochre">
                  {pendingCount} {pendingCount === 1 ? 'seleccionado' : 'seleccionados'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ESSENTIAL_DOCS.map((doc) => (
                <DocumentSlot
                  key={doc.id}
                  doc={doc}
                  file={pendingFiles[doc.id] ?? null}
                  onChange={(f) => setPendingFile(doc.id, f)}
                />
              ))}
            </div>

            <div className="mt-3">
              <DocumentSlot
                doc={CUADRO_EXPERIENCIA}
                file={pendingFiles[CUADRO_EXPERIENCIA.id] ?? null}
                onChange={(f) => setPendingFile(CUADRO_EXPERIENCIA.id, f)}
              />
            </div>

            <div className="mt-5">
              <p className="text-[12px] text-ink-3 mb-3">Otros documentos (estados financieros, referencias...)</p>
              <DropZone
                accept={['.pdf', '.doc', '.docx', '.xlsx', '.xls']}
                multiple
                onFiles={setPendingOtherFiles}
                isLoading={isUploading}
              />
            </div>

            {uploadError && (
              <p className="mt-3 text-[12px] text-terracotta">{uploadError}</p>
            )}
            {uploadSuccess && (
              <p className="mt-3 text-[12px] text-ochre">Documentos subidos correctamente.</p>
            )}

            {pendingCount > 0 && !isUploading && (
              <button
                type="button"
                onClick={handleUpload}
                className="mt-4 px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
              >
                Subir {pendingCount} {pendingCount === 1 ? 'documento' : 'documentos'}
              </button>
            )}
            {isUploading && (
              <p className="mt-4 text-[13px] text-ink-3">Subiendo documentos...</p>
            )}
          </section>

          {/* Análisis */}
          {empresa.estado === 'listo' && empresa.contexto_procesado && (
            <AnalisisSection analisis={empresa.contexto_procesado} />
          )}

          {empresa.estado === 'pendiente' && (
            <div className="px-4 py-3.5 rounded-[10px] bg-surface border border-border-subtle text-[13px] text-ink-2">
              El perfil de esta empresa aún no ha sido procesado. El análisis se generará automáticamente.
            </div>
          )}
          {empresa.estado === 'procesando' && (
            <div className="px-4 py-3.5 rounded-[10px] bg-amber-dim border border-amber/20 text-[13px] text-amber">
              El perfil de la empresa está siendo procesado. Esto puede tomar unos minutos.
            </div>
          )}
          {empresa.estado === 'error' && (
            <div className="px-4 py-3.5 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
              Ocurrió un error al procesar la empresa. Contacta al administrador.
            </div>
          )}

        </div>
      </div>
    </>
  )
}
