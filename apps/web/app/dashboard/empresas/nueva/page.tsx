'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { DropZone } from '@/components/ui/drop-zone'

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
// Form primitives
// ---------------------------------------------------------------------------

function Field({ label, htmlFor, required, error, children }: {
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

function Input({ id, value, onChange, placeholder, hasError }: {
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

const INITIAL_FILES: Record<string, File | null> = Object.fromEntries(
  [...ESSENTIAL_DOCS, CUADRO_EXPERIENCIA].map((d) => [d.id, null])
)

export default function NuevaEmpresaPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [nit, setNit] = useState('')
  const [sector, setSector] = useState('')
  const [essentialFiles, setEssentialFiles] = useState<Record<string, File | null>>(INITIAL_FILES)
  const [optionalFiles, setOptionalFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const loadedCount = Object.values(essentialFiles).filter(Boolean).length

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
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

  function setFile(docId: string, f: File | null) {
    setEssentialFiles((prev) => ({ ...prev, [docId]: f }))
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

    let idx = 0
    const allDocs = [...ESSENTIAL_DOCS, CUADRO_EXPERIENCIA]
    allDocs.forEach((doc) => {
      const f = essentialFiles[doc.id]
      if (f) {
        formData.append('archivos', f)
        formData.append(`tipo_documento_${idx}`, doc.id)
        idx++
      }
    })
    optionalFiles.forEach((f) => formData.append('archivos', f))

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

  const submitLabel = isSubmitting
    ? 'Creando empresa...'
    : loadedCount > 0
      ? `Crear empresa · ${loadedCount}/10 documentos`
      : 'Crear empresa'

  return (
    <>
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

      <div className="flex-1 px-8 py-8 overflow-auto">
        <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-8">

          {/* Datos básicos */}
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="max-w-xs">
              <Field label="Sector" htmlFor="sector">
                <Input
                  id="sector"
                  value={sector}
                  onChange={setSector}
                  placeholder="Construcción, Tecnología, Salud..."
                />
              </Field>
            </div>
          </section>

          {/* Documentos esenciales */}
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-[14px] font-semibold text-ink">Documentos esenciales</h2>
                <p className="text-[12px] text-ink-3 mt-0.5">
                  Solo PDF. Sube los que tengas — puedes completarlos después.
                </p>
              </div>
              {loadedCount > 0 && (
                <span className="text-[12px] font-mono tabular-nums text-ochre">
                  {loadedCount}/10
                </span>
              )}
            </div>

            {/* Grid 2 columnas — primeros 9 documentos */}
            <div className="grid grid-cols-2 gap-3">
              {ESSENTIAL_DOCS.map((doc) => (
                <DocumentSlot
                  key={doc.id}
                  doc={doc}
                  file={essentialFiles[doc.id] ?? null}
                  onChange={(f) => setFile(doc.id, f)}
                />
              ))}
            </div>

            {/* Cuadro de experiencia — ancho completo, destacado */}
            <div className="mt-3">
              <DocumentSlot
                doc={CUADRO_EXPERIENCIA}
                file={essentialFiles[CUADRO_EXPERIENCIA.id] ?? null}
                onChange={(f) => setFile(CUADRO_EXPERIENCIA.id, f)}
              />
            </div>
          </section>

          {/* Otros documentos */}
          <section>
            <h2 className="text-[14px] font-semibold text-ink mb-1">Otros documentos</h2>
            <p className="text-[12px] text-ink-3 mb-3">
              Estados financieros, certificaciones adicionales, referencias comerciales.
            </p>
            <DropZone
              accept={['.pdf', '.doc', '.docx', '.xlsx', '.xls']}
              multiple
              onFiles={setOptionalFiles}
              label="Arrastra cualquier documento adicional"
              isLoading={isSubmitting}
            />
          </section>

          {submitError && (
            <div className="px-4 py-3 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
              {submitError}
            </div>
          )}

          <div className="flex items-center gap-3 pb-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitLabel}
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
