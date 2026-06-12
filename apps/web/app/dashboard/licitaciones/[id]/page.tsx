'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import { DropZone } from '@/components/ui/drop-zone'
import LicitacionTimeline from '@/components/dashboard/LicitacionTimeline'
import type { LicitacionDetail, TipoFase, EstadoLicitacion, ComparacionConEmpresa } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const TIPO_FASE_LABELS: Record<TipoFase, string> = {
  prepliego:                'Pre-pliego',
  pliego_definitivo:        'Pliego definitivo',
  anexos:                   'Anexos',
  evaluacion_observaciones: 'Evaluación y observaciones',
}

const FASES_ORDEN: TipoFase[] = [
  'prepliego', 'pliego_definitivo', 'anexos', 'evaluacion_observaciones',
]

const ESTADO_LIC_BADGE: Record<EstadoLicitacion, { label: string; cls: string }> = {
  activa:     { label: 'Activa',     cls: 'bg-ochre-dim text-ochre' },
  adjudicada: { label: 'Adjudicada', cls: 'bg-surface-2 text-ink-2' },
  archivada:  { label: 'Archivada',  cls: 'bg-surface-2 text-ink-3' },
}

const ACCEPT_FILES = ['.pdf', '.doc', '.docx', '.xlsx', '.xls']

// ---------------------------------------------------------------------------
// Íconos
// ---------------------------------------------------------------------------

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3.5 6 8l4 4.5" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2.5" x2="8" y2="13.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" /><line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Modal — agregar fase
// ---------------------------------------------------------------------------

interface AgregarFaseModalProps {
  licitacionId: string
  tipoFaseInicial: TipoFase | null
  onClose: () => void
  onSuccess: () => void
}

function AgregarFaseModal({ licitacionId, tipoFaseInicial, onClose, onSuccess }: AgregarFaseModalProps) {
  const [tipoFase, setTipoFase] = useState<TipoFase>(tipoFaseInicial ?? 'prepliego')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('tipo_fase', tipoFase)
    files.forEach((f) => formData.append('archivos', f))

    try {
      await api.licitaciones.addFase(licitacionId, formData)
      onSuccess()
    } catch {
      setError('Error al agregar la fase. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg rounded-[16px] border border-border-subtle shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <p className="text-[15px] font-semibold text-ink">Agregar fase</p>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-3 hover:text-ink-2 transition-colors duration-150"
            aria-label="Cerrar"
          >
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-ink-2" htmlFor="tipoFase">
              Tipo de fase
              <span className="text-terracotta ml-1" aria-label="requerido">*</span>
            </label>
            <select
              id="tipoFase"
              value={tipoFase}
              onChange={(e) => setTipoFase(e.target.value as TipoFase)}
              className="w-full px-3.5 py-2.5 rounded-[10px] text-[14px] bg-surface border border-border-subtle text-ink outline-none focus:border-border focus:ring-1 focus:ring-border transition-colors duration-150"
            >
              {FASES_ORDEN.map((t) => (
                <option key={t} value={t}>{TIPO_FASE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-ink-2">
              Documentos <span className="text-ink-3 font-normal">(opcional)</span>
            </p>
            <DropZone
              accept={ACCEPT_FILES}
              multiple
              onFiles={setFiles}
              label="Arrastra los documentos de esta fase"
              isLoading={isSubmitting}
            />
          </div>

          {error && <p className="text-[13px] text-terracotta">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Guardando...' : 'Agregar fase'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[10px] text-[13px] text-ink-2 hover:bg-surface-2 transition-colors duration-150"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <div className="h-4 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="h-8 w-32 bg-surface-2 rounded-[10px] animate-pulse" />
      </header>
      <div className="flex-1 px-8 py-7 max-w-3xl space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-surface-2 rounded animate-pulse" />
          <div className="h-4 w-48 bg-surface-2 rounded animate-pulse" />
        </div>
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-5">
              <div className="w-5 h-5 rounded-full bg-surface-2 animate-pulse shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-surface-2 rounded animate-pulse" />
                <div className="h-10 bg-surface-2 rounded-[10px] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default function LicitacionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session, isPending: sessionPending } = authClient.useSession()

  const [licitacion, setLicitacion] = useState<LicitacionDetail | null>(null)
  const [comparaciones, setComparaciones] = useState<ComparacionConEmpresa[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [tipoFaseModal, setTipoFaseModal] = useState<TipoFase | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  function loadData() {
    if (!session) return
    setIsLoading(true)
    Promise.all([
      api.licitaciones.get(id),
      api.comparaciones.list({ licitacionId: id, ronda: 'definitivo' }),
    ])
      .then(([lic, comps]) => {
        setLicitacion(lic)
        setComparaciones(comps)
      })
      .catch(() => setError('No se pudo cargar la licitación.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadData() }, [session, id]) // eslint-disable-line react-hooks/exhaustive-deps

  function openModal(tipo: TipoFase | null) {
    setTipoFaseModal(tipo)
    setModalOpen(true)
  }

  function handleFaseAdded() {
    setModalOpen(false)
    loadData()
  }

  async function handleAnalyzarEmpresas(faseId: string, empresaIds: string[]) {
    await api.licitaciones.analizarEmpresas(id, faseId, empresaIds)
    loadData()
  }

  if (sessionPending || isLoading) return <Skeleton />
  if (!session) return null

  if (error || !licitacion) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-xs">
          <p className="text-[14px] font-semibold text-ink mb-2">Licitación no encontrada</p>
          <p className="text-[13px] text-ink-2 mb-5">{error ?? 'No existe o no tienes acceso.'}</p>
          <Link href="/dashboard/pliegos" className="text-[13px] text-terracotta hover:underline">
            ← Volver a licitaciones
          </Link>
        </div>
      </div>
    )
  }

  const estadoBadge = ESTADO_LIC_BADGE[licitacion.estado as EstadoLicitacion] ?? ESTADO_LIC_BADGE.activa

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/dashboard/pliegos"
            className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150 shrink-0"
          >
            <IconBack />
            Licitaciones
          </Link>
          <span className="text-border-subtle" aria-hidden="true">/</span>
          <span className="text-[13px] font-medium text-ink truncate">{licitacion.nombre}</span>
        </div>

        <button
          type="button"
          onClick={() => openModal(null)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 shrink-0"
        >
          <IconPlus />
          Agregar fase
        </button>
      </header>

      {/* Contenido */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        <div className="max-w-3xl">

          {/* Header licitación */}
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-1">
              <h1 className="text-[20px] font-bold text-ink leading-tight flex-1 min-w-0">
                {licitacion.nombre}
              </h1>
              <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium shrink-0 ${estadoBadge.cls}`}>
                {estadoBadge.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3 mt-2">
              {licitacion.secop_id && (
                <span>SECOP II: <span className="text-ink-2 font-mono">{licitacion.secop_id}</span></span>
              )}
              {licitacion.entidad_contratante && <span>{licitacion.entidad_contratante}</span>}
              <span>Creada {new Date(licitacion.created_at).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}</span>
            </div>
          </div>

          {/* Timeline */}
          <LicitacionTimeline
            fases={licitacion.fases}
            licitacionId={licitacion.id}
            pliegoId={licitacion.pliego_id}
            comparaciones={comparaciones}
            onAgregarFase={openModal}
            onAnalyzarEmpresas={handleAnalyzarEmpresas}
          />
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <AgregarFaseModal
          licitacionId={licitacion.id}
          tipoFaseInicial={tipoFaseModal}
          onClose={() => setModalOpen(false)}
          onSuccess={handleFaseAdded}
        />
      )}
    </>
  )
}
