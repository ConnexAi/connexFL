'use client'

import { useEffect, useState, useRef } from 'react'
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

// ---------------------------------------------------------------------------
// Form field
// ---------------------------------------------------------------------------

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  error?: string | undefined
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="text-terracotta ml-1" aria-label="requerido">*</span>}
      </label>
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

function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={[
        'w-full px-3.5 py-2.5 rounded-[10px] text-[14px] bg-surface border border-border-subtle text-ink',
        'placeholder:text-ink-3 outline-none transition-colors duration-150 resize-none',
        'focus:border-border focus:ring-1 focus:ring-border',
      ].join(' ')}
    />
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NuevaEmpresaPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [sector, setSector] = useState('')
  const [contexto, setContexto] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
  }, [session, sessionPending, router])

  if (sessionPending) return null
  if (!session) return null

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!nombre.trim()) errs.nombre = 'El nombre de la empresa es requerido.'
    if (!nit.trim()) errs.nit = 'El NIT es requerido.'
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
    formData.append('nit', nit.trim())
    if (sector.trim()) formData.append('sector', sector.trim())
    if (contexto.trim()) formData.append('contexto_texto', contexto.trim())
    files.forEach((f) => formData.append('archivos', f))

    try {
      const res = await fetch(`${API}/api/empresas`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `Error ${res.status}`)
      }

      const created = await res.json() as { id: string }
      router.push(`/dashboard/empresas/${created.id}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la empresa. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center gap-2 px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <Link
          href="/dashboard/empresas"
          className="flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink transition-colors duration-150"
          aria-label="Volver a empresas"
        >
          <IconBack />
          Empresas
        </Link>
        <span className="text-border-subtle" aria-hidden="true">/</span>
        <span className="text-[13px] font-medium text-ink">Nueva empresa</span>
      </header>

      {/* Form */}
      <div className="flex-1 px-8 py-8 overflow-auto">
        <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-5">

          <Field label="Nombre de la empresa" htmlFor="nombre" required error={errors.nombre}>
            <Input
              id="nombre"
              value={nombre}
              onChange={setNombre}
              placeholder="Constructora Andina SAS"
              hasError={!!errors.nombre}
            />
          </Field>

          <Field label="NIT" htmlFor="nit" required error={errors.nit}>
            <Input
              id="nit"
              value={nit}
              onChange={setNit}
              placeholder="900.123.456-7"
              hasError={!!errors.nit}
            />
          </Field>

          <Field label="Sector" htmlFor="sector">
            <Input
              id="sector"
              value={sector}
              onChange={setSector}
              placeholder="Construcción, Tecnología, Salud..."
            />
          </Field>

          <Field label="Contexto adicional" htmlFor="contexto">
            <Textarea
              id="contexto"
              value={contexto}
              onChange={setContexto}
              placeholder="Capacidad financiera, experiencia relevante, certificaciones, restricciones..."
              rows={4}
            />
          </Field>

          <div className="space-y-1.5">
            <p className="text-[13px] font-medium text-ink-2">Documentos</p>
            <p className="text-[12px] text-ink-3 mb-2">
              RUT, estados financieros, certificados, registros de experiencia.
            </p>
            <DropZone
              accept={ACCEPT_FILES}
              multiple
              onFiles={setFiles}
              isLoading={isSubmitting}
            />
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
              {isSubmitting ? 'Creando empresa...' : 'Crear empresa'}
            </button>
            <Link
              href="/dashboard/empresas"
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
