'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import type { EmpresaDetail, EstadoEmpresa } from '@/lib/types'

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

function formatSize(name: string): string {
  // Server paths don't carry size info; show name only
  return basename(name)
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

  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session || !id) return
    setIsLoading(true)
    fetch(`${API}/api/empresas/${id}`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 404) {
          router.replace('/dashboard/empresas')
          return
        }
        if (!res.ok) throw new Error(`${res.status}`)
        const data: EmpresaDetail = await res.json()
        setEmpresa(data)
      })
      .catch(() => setFetchError('No se pudo cargar la empresa. Intenta de nuevo.'))
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
      setUploadFiles([])
      // Refresh empresa data to show new files
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
      {/* Topbar */}
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

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        <div className="max-w-2xl space-y-7">

          {/* Info section */}
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
              <p className="text-[12px] text-ink-3">Agrega más documentos a esta empresa.</p>
              <DropZone
                accept={ACCEPT_FILES}
                multiple
                onFiles={setUploadFiles}
                isLoading={isUploading}
              />
              {uploadError && (
                <p className="text-[12px] text-terracotta">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="text-[12px] text-ochre">Archivos subidos correctamente.</p>
              )}
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

          {/* Analysis section — only when listo */}
          {empresa.estado === 'listo' && empresa.contexto_procesado && (
            <section className="rounded-[16px] border border-border-subtle p-6">
              <h3 className="text-[15px] font-semibold text-ink mb-4">Análisis de contexto</h3>
              <div className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap">
                {empresa.contexto_procesado}
              </div>
            </section>
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
