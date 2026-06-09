'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

const ACCEPT_FILES = ['.pdf', '.doc', '.docx', '.xlsx', '.xls']

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

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------

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

function Input({
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

export default function NuevoPliegoPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [secopId, setSecopId] = useState('')
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

  if (sessionPending) return null
  if (!session) return null

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!nombre.trim()) errs.nombre = 'El nombre de la licitación es requerido.'
    if (files.length === 0) errs.files = 'Sube al menos un archivo del pliego.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    const formData = new FormData()
    formData.append('nombre', nombre.trim())
    if (secopId.trim()) formData.append('secop_id', secopId.trim())
    files.forEach((f) => formData.append('archivos', f))

    try {
      const res = await fetch(`${API}/api/pliegos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
      }

      setSuccess(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al subir el pliego. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <span className="text-[13px] font-medium text-ink">Nuevo pliego</span>
        </header>
        <div className="flex-1 flex items-center justify-center px-8 py-8">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-full bg-ochre-dim flex items-center justify-center mx-auto mb-5 [&_svg]:text-ochre">
              <IconCheck />
            </div>
            <p className="text-[15px] font-semibold text-ink mb-2">Pliego enviado</p>
            <p className="text-[13px] text-ink-2 leading-relaxed mb-7 text-pretty">
              El pliego está siendo analizado. El proceso puede tomar unos minutos.
              Puedes revisar el estado en la lista de pliegos.
            </p>
            <Link
              href="/dashboard/pliegos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
            >
              Ver mis pliegos
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/pliegos"
          className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150"
          aria-label="Volver a pliegos"
        >
          <IconBack />
          Pliegos
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink">Nuevo pliego</span>
      </header>

      {/* Form */}
      <div className="flex-1 px-8 py-8 overflow-auto">
        <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-5">

          <Field label="Nombre de la licitación" htmlFor="nombre" required error={errors.nombre}>
            <Input
              id="nombre"
              value={nombre}
              onChange={setNombre}
              placeholder="Construcción vía terciaria municipio de Timaná"
              hasError={!!errors.nombre}
            />
          </Field>

          <Field
            label="ID SECOP II"
            htmlFor="secopId"
            hint="Opcional. Código de referencia del proceso en el SECOP II."
          >
            <Input
              id="secopId"
              value={secopId}
              onChange={setSecopId}
              placeholder="HUC-OP-001-2025"
            />
          </Field>

          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-ink-2">
              Archivos del pliego
              <span className="text-terracotta ml-1" aria-label="requerido">*</span>
            </p>
            <p className="text-[12px] text-ink-3 mb-2">
              Puedes subir el pliego principal, el estudio previo y cualquier anexo relevante.
            </p>
            <DropZone
              accept={ACCEPT_FILES}
              multiple
              onFiles={setFiles}
              label="Arrastra el pliego, estudio previo o análisis de sector"
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

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Analizando...' : 'Analizar pliego'}
            </button>
            <Link
              href="/dashboard/pliegos"
              className="px-4 py-2.5 rounded-[10px] text-[13px] text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors duration-150"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}
