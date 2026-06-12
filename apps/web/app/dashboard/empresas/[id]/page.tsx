'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import type { AnalisisEmpresa, EmpresaDetail, EstadoEmpresa } from '@/lib/types'
import { ChevronLeft, FileText, X, Download } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

// ---------------------------------------------------------------------------
// Document definitions
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
  note: 'Define qué licitaciones puede ganar la empresa',
  isImportant: true,
}

const ALL_DOCS = [...ESSENTIAL_DOCS, CUADRO_EXPERIENCIA]
const INITIAL_PENDING: Record<string, File | null> = Object.fromEntries(ALL_DOCS.map((d) => [d.id, null]))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path
}

const estadoMap: Record<EstadoEmpresa, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-surface-2 text-ink-3' },
  procesando: { label: 'Procesando', cls: 'bg-amber-dim text-amber' },
  listo:      { label: 'Listo',      cls: 'bg-success-dim text-success' },
  error:      { label: 'Error',      cls: 'bg-terracotta-dim text-terracotta' },
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
  const loaded = file !== null

  function pick(f: File | undefined) { if (f) onChange(f) }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Subir: ${doc.label}`}
      className={[
        'rounded-lg border transition-colors duration-150 cursor-pointer select-none outline-none p-3',
        'focus-visible:ring-1 focus-visible:ring-terracotta',
        loaded
          ? 'border-ochre bg-ochre-dim'
          : isDragging
            ? 'border-terracotta bg-terracotta-dim'
            : doc.isImportant
              ? 'border-ochre/40 bg-surface hover:border-ochre/70'
              : 'border-border bg-surface hover:border-terracotta/40',
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
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-medium leading-snug ${loaded ? 'text-ochre' : 'text-ink-2'}`}>
          {doc.label}
        </p>
        {loaded ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="text-ochre hover:opacity-60 transition-opacity shrink-0"
            aria-label="Quitar archivo"
          >
            <X size={12} />
          </button>
        ) : doc.isImportant ? (
          <span className="inline-flex items-center h-4 px-1.5 rounded-full bg-ochre-dim text-ochre text-[9px] font-semibold whitespace-nowrap shrink-0">
            Clave
          </span>
        ) : null}
      </div>
      <p className="text-[10px] text-ink-3 mt-1">
        {loaded ? file.name : (doc.note ?? 'PDF · Arrastra o clic')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Análisis badge helpers
// ---------------------------------------------------------------------------

function habBadge(h: AnalisisEmpresa['habilitacion_legal']): { label: string; cls: string } {
  if (h === 'habilitada') return { label: 'Habilitada', cls: 'bg-success-dim text-success' }
  if (h === 'inhabilitada') return { label: 'Inhabilitada', cls: 'bg-terracotta-dim text-terracotta' }
  return { label: 'Sin verificar', cls: 'bg-surface-2 text-ink-3' }
}

function nivelBadge(n: 'alto' | 'medio' | 'bajo'): { label: string; cls: string } {
  if (n === 'alto') return { label: 'Alto', cls: 'bg-success-dim text-success' }
  if (n === 'medio') return { label: 'Medio', cls: 'bg-amber-dim text-amber' }
  return { label: 'Bajo', cls: 'bg-terracotta-dim text-terracotta' }
}

function AnalisisPanel({ analisis, empresaId }: { analisis: AnalisisEmpresa; empresaId: string }) {
  const { label: habLabel, cls: habCls } = habBadge(analisis.habilitacion_legal)
  const { label: nivLabel, cls: nivCls } = nivelBadge(analisis.indicadores_financieros.nivel)

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <a
          href={`${API}/api/empresas/${empresaId}/analisis-docx`}
          download
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-medium text-ink-2 hover:text-ink hover:bg-bg transition-colors"
        >
          <Download size={13} />
          Descargar .docx
        </a>
      </div>

      <div className="bg-bg rounded-xl p-5">
        <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-2">Resumen ejecutivo</p>
        <p className="text-[13px] text-ink-2 leading-relaxed">{analisis.resumen_ejecutivo}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 text-center">
          <p className="text-[28px] font-bold text-ochre tabular-nums leading-none">{analisis.anos_experiencia}</p>
          <p className="text-[10px] text-ink-3 mt-1">Años exp.</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center flex flex-col items-center justify-center gap-1.5">
          <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium ${habCls}`}>{habLabel}</span>
          <p className="text-[10px] text-ink-3">Legal</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 text-center flex flex-col items-center justify-center gap-1.5">
          <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium ${nivCls}`}>{nivLabel}</span>
          <p className="text-[10px] text-ink-3">Financiero</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {analisis.fortalezas.length > 0 && (
          <div className="bg-success-dim rounded-xl p-4">
            <p className="text-[12px] font-semibold text-success mb-2">Fortalezas</p>
            <ul className="space-y-1.5">
              {analisis.fortalezas.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-ink-2">
                  <span className="text-success mt-0.5 shrink-0 leading-none">+</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analisis.debilidades.length > 0 && (
          <div className="bg-terracotta-dim rounded-xl p-4">
            <p className="text-[12px] font-semibold text-terracotta mb-2">Debilidades</p>
            <ul className="space-y-1.5">
              {analisis.debilidades.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-ink-2">
                  <span className="text-terracotta mt-0.5 shrink-0 leading-none">–</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {analisis.tipos_contrato_recomendados.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-ink mb-2">Tipos de contrato recomendados</p>
          <div className="flex flex-wrap gap-2">
            {analisis.tipos_contrato_recomendados.map((tipo, i) => (
              <span key={i} className="inline-flex items-center h-6 px-3 rounded-full bg-bg border border-border text-[11px] text-ink-2">{tipo}</span>
            ))}
          </div>
        </div>
      )}

      {analisis.contratos_ejecutados.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-ink mb-3">
            Contratos ejecutados{' '}
            <span className="font-normal text-ink-3 font-mono">{analisis.contratos_ejecutados.length}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 pr-3 text-[10px] font-medium text-ink-3 w-[40%]">Descripción</th>
                  <th className="text-left pb-2 pr-3 text-[10px] font-medium text-ink-3">Entidad</th>
                  <th className="text-left pb-2 pr-3 text-[10px] font-medium text-ink-3 whitespace-nowrap">Valor</th>
                  <th className="text-left pb-2 text-[10px] font-medium text-ink-3">Año</th>
                </tr>
              </thead>
              <tbody>
                {analisis.contratos_ejecutados.map((c, i) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0">
                    <td className="py-2 pr-3 text-ink-2 align-top">{c.descripcion}</td>
                    <td className="py-2 pr-3 text-ink-3 align-top">{c.entidad}</td>
                    <td className="py-2 pr-3 text-ink-3 align-top font-mono whitespace-nowrap">{c.valor_aproximado}</td>
                    <td className="py-2 text-ink-3 align-top font-mono">{c.ano}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analisis.capacidad_tecnica && (
        <div>
          <p className="text-[12px] font-semibold text-ink mb-2">Capacidad técnica</p>
          <p className="text-[12px] text-ink-2 leading-relaxed">{analisis.capacidad_tecnica}</p>
        </div>
      )}
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
        setEmpresa(await res.json() as EmpresaDetail)
      })
      .catch(() => setFetchError('No se pudo cargar la empresa.'))
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
      if (f) { formData.append('archivos', f); formData.append(`tipo_documento_${idx}`, doc.id); idx++ }
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
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-14 bg-bg border-b border-border shrink-0">
          <div className="h-4 w-48 bg-border rounded animate-pulse" />
        </header>
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1280px] mx-auto px-8 py-8">
            <div className="grid grid-cols-2 gap-8">
              {[0, 1].map((i) => (
                <div key={i} className="bg-surface rounded-2xl border border-border h-64 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!session) return null

  if (fetchError || !empresa) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-14 bg-bg border-b border-border shrink-0">
          <Link href="/dashboard/empresas" className="flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink transition-colors">
            <ChevronLeft size={14} />Empresas
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px] text-ink-2 mb-4">{fetchError ?? 'Empresa no encontrada.'}</p>
            <Link href="/dashboard/empresas" className="text-[13px] text-terracotta hover:text-terracotta-hover transition-colors">
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
      {/* Breadcrumb */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-14 bg-bg border-b border-border shrink-0">
        <Link href="/dashboard/empresas" className="flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink transition-colors">
          <ChevronLeft size={14} />
          Empresas
        </Link>
        <span className="text-border" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink truncate max-w-[260px]">{empresa.nombre}</span>
        <div className="flex-1" />
        <button type="button" className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-ink-2 border border-border hover:bg-surface transition-colors">
          Editar
        </button>
      </header>

      {/* 50/50 content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-8 py-8">
          <div className="grid grid-cols-2 gap-8 items-start">

            {/* Left column: Info + Documents */}
            <div className="space-y-6">
              {/* Info */}
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-terracotta-dim flex items-center justify-center shrink-0">
                      <span className="text-[14px] font-bold text-terracotta select-none">
                        {empresa.nombre.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-[16px] font-bold text-ink leading-tight">{empresa.nombre}</h1>
                      <p className="text-[12px] text-ink-3 font-mono mt-0.5">{empresa.nit}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${estadoCls}`}>
                    {estadoLabel}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {empresa.sector && (
                    <div>
                      <dt className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-0.5">Sector</dt>
                      <dd className="text-[13px] text-ink">{empresa.sector}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-0.5">Registrada</dt>
                    <dd className="text-[13px] text-ink">{formatDate(empresa.created_at)}</dd>
                  </div>
                </dl>
              </div>

              {/* Uploaded docs */}
              {archivos.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <h2 className="text-[14px] font-semibold text-ink mb-4">
                    Documentos subidos
                    <span className="ml-2 text-[12px] font-normal text-ink-3 font-mono">{archivos.length}</span>
                  </h2>
                  <ul className="space-y-1.5" role="list">
                    {archivos.map((path, i) => (
                      <li key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-bg border border-border">
                        <FileText size={13} className="text-ink-3 shrink-0" />
                        <span className="flex-1 min-w-0 text-[12px] text-ink truncate">{basename(path)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upload section */}
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <div className="flex items-baseline justify-between mb-4">
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink">
                      {archivos.length === 0 ? 'Subir documentos' : 'Agregar documentos'}
                    </h2>
                    <p className="text-[11px] text-ink-3 mt-0.5">Solo PDF</p>
                  </div>
                  {pendingCount > 0 && (
                    <span className="text-[11px] font-mono text-ochre tabular-nums">
                      {pendingCount} seleccionado{pendingCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ESSENTIAL_DOCS.map((doc) => (
                    <DocumentSlot
                      key={doc.id}
                      doc={doc}
                      file={pendingFiles[doc.id] ?? null}
                      onChange={(f) => setPendingFile(doc.id, f)}
                    />
                  ))}
                </div>
                <div className="mt-2">
                  <DocumentSlot
                    doc={CUADRO_EXPERIENCIA}
                    file={pendingFiles[CUADRO_EXPERIENCIA.id] ?? null}
                    onChange={(f) => setPendingFile(CUADRO_EXPERIENCIA.id, f)}
                  />
                </div>

                <div className="mt-4">
                  <p className="text-[11px] text-ink-3 mb-2">Otros documentos (estados financieros, referencias...)</p>
                  <DropZone
                    accept={['.pdf', '.doc', '.docx', '.xlsx', '.xls']}
                    multiple
                    onFiles={setPendingOtherFiles}
                    isLoading={isUploading}
                  />
                </div>

                {uploadError && <p className="mt-3 text-[12px] text-terracotta">{uploadError}</p>}
                {uploadSuccess && <p className="mt-3 text-[12px] text-success">Documentos subidos correctamente.</p>}

                {pendingCount > 0 && !isUploading && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="mt-4 px-4 py-2.5 rounded-lg text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
                  >
                    Subir {pendingCount} {pendingCount === 1 ? 'documento' : 'documentos'}
                  </button>
                )}
                {isUploading && <p className="mt-4 text-[13px] text-ink-3">Subiendo documentos...</p>}
              </div>
            </div>

            {/* Right column: Analysis */}
            <div
              className="bg-surface rounded-2xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sticky top-[72px] max-h-[calc(100vh-120px)] overflow-auto"
            >
              <h2 className="text-[14px] font-semibold text-ink mb-5">Análisis del perfil</h2>

              {empresa.estado === 'listo' && empresa.contexto_procesado ? (
                <AnalisisPanel analisis={empresa.contexto_procesado} empresaId={id} />
              ) : empresa.estado === 'procesando' ? (
                <div className="px-4 py-4 rounded-xl bg-amber-dim border border-amber/20 text-[13px] text-amber leading-relaxed">
                  El perfil está siendo procesado. Esto puede tomar unos minutos.
                </div>
              ) : empresa.estado === 'error' ? (
                <div className="px-4 py-4 rounded-xl bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta leading-relaxed">
                  Ocurrió un error al procesar la empresa. Contacta al administrador.
                </div>
              ) : (
                <div className="px-4 py-4 rounded-xl bg-bg border border-border text-[13px] text-ink-2 leading-relaxed">
                  El análisis se generará automáticamente una vez subas los documentos de la empresa.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
