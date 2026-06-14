'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'
import { api } from '@/lib/api'
import type { TipoFase } from '@/lib/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPT_FILES = ['.pdf', '.doc', '.docx', '.xlsx', '.xls']

const VALID_FASES: TipoFase[] = [
  'prepliego', 'pliego_definitivo', 'anexos', 'evaluacion_observaciones',
]

const FASE_CONFIG: Array<{
  tipo: TipoFase
  label: string
  descripcion: string
  uploadLabel: string
  requiresFiles: boolean
}> = [
  {
    tipo: 'prepliego',
    label: 'Pre-pliego',
    descripcion: 'Análisis previo antes de la publicación del pliego definitivo',
    uploadLabel: 'Arrastra el borrador del pliego, el estudio previo o el análisis del sector',
    requiresFiles: true,
  },
  {
    tipo: 'pliego_definitivo',
    label: 'Pliego definitivo',
    descripcion: 'Análisis del pliego definitivo publicado en el SECOP II',
    uploadLabel: 'Arrastra el pliego definitivo, adendas o documentos del proceso',
    requiresFiles: true,
  },
  {
    tipo: 'anexos',
    label: 'Anexos',
    descripcion: 'Preparación de formularios y anexos para presentar la oferta',
    uploadLabel: 'Arrastra modelos de anexo, formularios o documentos base (opcional)',
    requiresFiles: false,
  },
  {
    tipo: 'evaluacion_observaciones',
    label: 'Evaluación y observaciones',
    descripcion: 'Observaciones al informe de evaluación publicado por la entidad',
    uploadLabel: 'Arrastra el informe de evaluación o documentos relacionados (opcional)',
    requiresFiles: false,
  },
]

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

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconPrepliego() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function IconPliegoDefinitivo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconAnexos() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function IconEvaluacion() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

const FASE_ICONS: Record<TipoFase, React.ReactNode> = {
  prepliego: <IconPrepliego />,
  pliego_definitivo: <IconPliegoDefinitivo />,
  anexos: <IconAnexos />,
  evaluacion_observaciones: <IconEvaluacion />,
}

// ---------------------------------------------------------------------------
// Small components
// ---------------------------------------------------------------------------

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Paso ${step} de 3`}>
      {([1, 2, 3] as const).map((n) => (
        <div
          key={n}
          className={[
            'rounded-full transition-all duration-150',
            n === step
              ? 'w-5 h-2 bg-terracotta'
              : n < step
                ? 'w-2 h-2 bg-terracotta/40'
                : 'w-2 h-2 bg-border',
          ].join(' ')}
        />
      ))}
    </div>
  )
}

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  error?: string | undefined
  hint?: string | undefined
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="text-terracotta ml-1" aria-label="requerido">*</span>}
      </label>
      {hint && <p className="text-[12px] text-ink-3 -mt-0.5">{hint}</p>}
      {children}
      {error && <p className="text-[12px] text-terracotta">{error}</p>}
    </div>
  )
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  hasError,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hasError?: boolean
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        'w-full px-3.5 py-2.5 rounded-[10px] text-[14px] bg-surface border text-ink',
        'placeholder:text-ink-3 outline-none transition-colors duration-150',
        'focus:border-border focus:ring-1 focus:ring-border',
        hasError ? 'border-terracotta' : 'border-border-subtle',
      ].join(' ')}
    />
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NuevaLicitacionPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 fields
  const [nombre, setNombre] = useState('')
  const [secopId, setSecopId] = useState('')
  const [entidadContratante, setEntidadContratante] = useState('')

  // Step 2
  const [tipoFase, setTipoFase] = useState<TipoFase | null>(null)

  // Step 3
  const [files, setFiles] = useState<File[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
  }, [session, sessionPending, router])

  const handleFiles = useCallback((f: File[]) => setFiles(f), [])

  if (sessionPending) return null
  if (!session) return null

  const faseConfig = FASE_CONFIG.find(f => f.tipo === tipoFase) ?? null

  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!nombre.trim()) errs.nombre = 'El nombre de la licitación es requerido.'
    if (!entidadContratante.trim()) errs.entidadContratante = 'La entidad contratante es requerida.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2(): boolean {
    if (!tipoFase) {
      setErrors({ tipoFase: 'Selecciona el tipo de fase para continuar.' })
      return false
    }
    setErrors({})
    return true
  }

  function validateStep3(): boolean {
    const errs: Record<string, string> = {}
    if (faseConfig?.requiresFiles && files.length === 0) {
      errs.files = 'Sube al menos un archivo para esta fase.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goToStep2() {
    if (validateStep1()) {
      setErrors({})
      setStep(2)
    }
  }

  function goToStep3() {
    if (validateStep2()) {
      setErrors({})
      setStep(3)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep3()) return
    if (!tipoFase) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const licitacion = await api.licitaciones.create({
        nombre: nombre.trim(),
        ...(secopId.trim() ? { secopId: secopId.trim() } : {}),
        entidadContratante: entidadContratante.trim(),
      })

      const formData = new FormData()
      formData.append('tipo_fase', tipoFase)
      files.forEach((f) => formData.append('archivos', f))

      await api.licitaciones.addFase(licitacion.id, formData)

      setSuccess(true)
      router.push(`/dashboard/licitaciones/${licitacion.id}?fase=${tipoFase}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la licitación. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) return null

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/pliegos"
          className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150"
          aria-label="Volver a licitaciones"
        >
          <IconBack />
          Licitaciones
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink">Nueva licitación</span>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-8 overflow-auto">
        <div className="max-w-xl">

          {/* Step indicator */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-[11px] text-ink-3 uppercase tracking-wide font-medium mb-1">
                Paso {step} de 3
              </p>
              <p className="text-[15px] font-semibold text-ink">
                {step === 1 && 'Datos de la licitación'}
                {step === 2 && 'Tipo de fase'}
                {step === 3 && 'Subir documentos'}
              </p>
            </div>
            <StepIndicator step={step} />
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-5">
              <Field label="Nombre de la licitación" htmlFor="nombre" required error={errors.nombre}>
                <TextInput
                  id="nombre"
                  value={nombre}
                  onChange={setNombre}
                  placeholder="Construcción vía terciaria municipio de Timaná"
                  hasError={!!errors.nombre}
                />
              </Field>

              <Field
                label="Entidad contratante"
                htmlFor="entidadContratante"
                required
                error={errors.entidadContratante}
              >
                <TextInput
                  id="entidadContratante"
                  value={entidadContratante}
                  onChange={setEntidadContratante}
                  placeholder="Alcaldía Municipal de Timaná"
                  hasError={!!errors.entidadContratante}
                />
              </Field>

              <Field
                label="ID SECOP II"
                htmlFor="secopId"
                hint="Opcional. Código del proceso en el SECOP II."
              >
                <TextInput
                  id="secopId"
                  value={secopId}
                  onChange={setSecopId}
                  placeholder="HUC-OP-001-2025"
                />
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={goToStep2}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
                >
                  Continuar
                </button>
                <Link
                  href="/dashboard/pliegos"
                  className="px-4 py-2.5 rounded-[10px] text-[13px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150"
                >
                  Cancelar
                </Link>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {FASE_CONFIG.map((fase) => {
                  const selected = tipoFase === fase.tipo
                  return (
                    <button
                      key={fase.tipo}
                      type="button"
                      onClick={() => { setTipoFase(fase.tipo); setErrors({}) }}
                      className={[
                        'text-left p-4 rounded-[14px] border-2 transition-all duration-150',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta',
                        selected
                          ? 'border-terracotta bg-terracotta-dim'
                          : 'border-border-subtle bg-surface hover:border-border hover:bg-surface-2',
                      ].join(' ')}
                      aria-pressed={selected}
                    >
                      <div className={[
                        'w-8 h-8 rounded-[8px] flex items-center justify-center mb-3',
                        selected ? 'bg-terracotta/15 text-terracotta' : 'bg-surface-2 text-ink-2',
                      ].join(' ')}>
                        {FASE_ICONS[fase.tipo]}
                      </div>
                      <p className={[
                        'text-[13px] font-semibold leading-snug mb-1',
                        selected ? 'text-terracotta' : 'text-ink',
                      ].join(' ')}>
                        {fase.label}
                      </p>
                      <p className="text-[12px] text-ink-3 leading-snug">
                        {fase.descripcion}
                      </p>
                    </button>
                  )
                })}
              </div>

              {errors.tipoFase && (
                <p className="text-[12px] text-terracotta">{errors.tipoFase}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={goToStep3}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={() => { setErrors({}); setStep(1) }}
                  className="px-4 py-2.5 rounded-[10px] text-[13px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150"
                >
                  Atrás
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && faseConfig && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Fase summary */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-surface border border-border-subtle">
                <div className="w-8 h-8 rounded-[8px] bg-terracotta/15 text-terracotta flex items-center justify-center shrink-0">
                  {FASE_ICONS[faseConfig.tipo]}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{faseConfig.label}</p>
                  <p className="text-[12px] text-ink-3 truncate">{nombre}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[13px] font-medium text-ink-2">
                  Documentos
                  {faseConfig.requiresFiles && (
                    <span className="text-terracotta ml-1" aria-label="requerido">*</span>
                  )}
                </p>
                <DropZone
                  accept={ACCEPT_FILES}
                  multiple
                  onFiles={handleFiles}
                  label={faseConfig.uploadLabel}
                  isLoading={isSubmitting}
                />
                {errors.files && (
                  <p className="text-[12px] text-terracotta">{errors.files}</p>
                )}
              </div>

              {submitError && (
                <div className="px-4 py-3 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
                  {submitError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creando...' : 'Iniciar análisis'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setErrors({}); setStep(2) }}
                  className="px-4 py-2.5 rounded-[10px] text-[13px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150 disabled:opacity-40"
                >
                  Atrás
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </>
  )
}
