'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import type { EmpresaListItem, EstadoEmpresa } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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

function IconPlus() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2.5" x2="8" y2="13.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" />
    </svg>
  )
}

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5 10 8l-4 4.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-border-subtle px-1">
      <div className="w-9 h-9 rounded-full bg-surface-2 animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-surface-2 rounded animate-pulse w-40" />
        <div className="h-3 bg-surface-2 rounded animate-pulse w-24" />
      </div>
      <div className="h-3 bg-surface-2 rounded animate-pulse w-28 hidden sm:block" />
      <div className="h-6 bg-surface-2 rounded-full animate-pulse w-20" />
      <div className="h-3 bg-surface-2 rounded animate-pulse w-20 hidden md:block" />
      <div className="w-4 h-4 bg-surface-2 rounded animate-pulse" />
    </div>
  )
}

function EmpresaRow({ empresa }: { empresa: EmpresaListItem }) {
  const { label, cls } = estadoMap[empresa.estado]
  return (
    <Link
      href={`/dashboard/empresas/${empresa.id}`}
      className="flex items-center gap-4 py-4 border-b border-border-subtle px-1 rounded-sm hover:bg-surface transition-colors duration-150 group -mx-1"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center shrink-0 text-[12px] font-semibold text-ink-2 select-none">
        {getInitials(empresa.nombre)}
      </div>

      {/* Name + NIT */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink truncate">{empresa.nombre}</p>
        <p className="text-[12px] text-ink-3 font-mono tabular-nums mt-0.5">{empresa.nit}</p>
      </div>

      {/* Sector */}
      <span className="hidden sm:block w-36 text-[13px] text-ink-2 truncate shrink-0">
        {empresa.sector ?? <span className="text-ink-3">—</span>}
      </span>

      {/* Estado */}
      <span className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${cls}`}>
        {label}
      </span>

      {/* Fecha */}
      <span className="hidden md:block w-24 text-[12px] text-ink-3 font-mono tabular-nums shrink-0 text-right">
        {formatDate(empresa.created_at)}
      </span>

      {/* Chevron */}
      <span className="text-ink-3 group-hover:text-ink-2 transition-colors duration-150 shrink-0">
        <IconChevron />
      </span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EmpresasPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()

  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) {
      router.push('/login')
    }
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    fetch(`${API}/api/empresas`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 401) { router.push('/login'); return }
        if (!res.ok) throw new Error(`${res.status}`)
        const data: EmpresaListItem[] = await res.json()
        setEmpresas(data)
      })
      .catch(() => setError('No se pudieron cargar las empresas. Intenta de nuevo.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) {
    return (
      <>
        <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
          <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
        </header>
        <div className="px-8 py-7 space-y-0">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-8 h-16 bg-bg border-b border-border-subtle shrink-0">
        <h1 className="text-[15px] font-semibold text-ink tracking-tight">Empresas</h1>
        <Link
          href="/dashboard/empresas/nueva"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
        >
          <IconPlus />
          Nueva empresa
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-7 overflow-auto">
        {error && (
          <div className="mb-5 px-4 py-3 rounded-[10px] bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : empresas.length === 0 ? (
          /* Empty state */
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-xs">
              <p className="text-[14px] font-semibold text-ink mb-2">Sin empresas registradas</p>
              <p className="text-[13px] text-ink-2 leading-relaxed mb-6 text-pretty">
                Agrega las empresas de tus clientes para empezar a analizar licitaciones del SECOP&nbsp;II.
              </p>
              <Link
                href="/dashboard/empresas/nueva"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150"
              >
                <IconPlus />
                Agregar primera empresa
              </Link>
            </div>
          </div>
        ) : (
          /* List */
          <div>
            {/* Column headers */}
            <div className="flex items-center gap-4 pb-2.5 border-b border-border px-1">
              <div className="w-9 shrink-0" aria-hidden="true" />
              <span className="flex-1 text-[11px] font-medium text-ink-3">Empresa</span>
              <span className="hidden sm:block w-36 text-[11px] font-medium text-ink-3 shrink-0">Sector</span>
              <span className="text-[11px] font-medium text-ink-3 w-20 shrink-0">Estado</span>
              <span className="hidden md:block w-24 text-[11px] font-medium text-ink-3 shrink-0 text-right">Creada</span>
              <div className="w-4 shrink-0" aria-hidden="true" />
            </div>
            <div>
              {empresas.map((e) => <EmpresaRow key={e.id} empresa={e} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
