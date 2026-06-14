'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import type { EmpresaListItem, EstadoEmpresa } from '@/lib/types'
import { api } from '@/lib/api'
import { Plus, ArrowRight, Trash2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

function getInitials(nombre: string): string {
  return nombre.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.toLocaleString('es-CO', { month: 'short' }).replace(/\./g, '')
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

const estadoMap: Record<EstadoEmpresa, { label: string; cls: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'bg-[#F3F4F6] text-[#6B7280]' },
  procesando: { label: 'Procesando', cls: 'bg-[#FEF9C3] text-[#854D0E]' },
  listo:      { label: 'Listo',      cls: 'bg-[#DCFCE7] text-[#15803D]' },
  error:      { label: 'Error',      cls: 'bg-[#FEE2E2] text-[#DC2626]' },
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-[10px] bg-border shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-border rounded w-36" />
          <div className="h-3 bg-border rounded w-24" />
        </div>
        <div className="h-5 bg-border rounded w-14" />
      </div>
      <div className="h-px bg-border" />
      <div className="space-y-1.5">
        <div className="h-3 bg-border rounded w-full" />
        <div className="h-3 bg-border rounded w-3/4" />
      </div>
      <div className="h-px bg-border" />
      <div className="flex gap-2">
        <div className="h-7 bg-border rounded-lg flex-1" />
        <div className="h-7 bg-border rounded-lg flex-1" />
      </div>
    </div>
  )
}

function ConfirmDeleteModal({
  nombre,
  mensaje,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  nombre: string
  mensaje: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-surface rounded-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.18)] w-full max-w-sm mx-4 p-6 space-y-4">
        <div>
          <p className="text-[15px] font-semibold text-[#111827]" style={OF}>
            ¿Eliminar &ldquo;{nombre}&rdquo;?
          </p>
          <p className="text-[13px] text-[#6B7280] mt-1.5 leading-relaxed" style={OF}>
            {mensaje}
          </p>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-[10px] text-[13px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
            style={{ ...OF, fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-[10px] text-[13px] text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors disabled:opacity-60"
            style={{ ...OF, fontWeight: 600 }}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmpresaCard({ empresa, onDeleteRequest }: { empresa: EmpresaListItem; onDeleteRequest: () => void }) {
  const { label, cls } = estadoMap[empresa.estado]
  const initials = getInitials(empresa.nombre)
  const isListo = empresa.estado === 'listo'
  const isProcessing = empresa.estado === 'procesando'

  const extract = isListo
    ? 'Análisis completado. Revisa el perfil completo para ver fortalezas, debilidades y contratos.'
    : 'Análisis pendiente de procesamiento.'

  return (
    <div className="bg-surface rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)] transition-shadow duration-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <div
          className="shrink-0 flex items-center justify-center rounded-[10px] bg-[#F3F4F6]"
          style={{ width: 44, height: 44 }}
        >
          <span style={{ ...OF, fontWeight: 700, fontSize: 18, color: '#374151', lineHeight: 1 }}>
            {initials}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-[#111827] leading-snug truncate" style={{ ...OF, fontWeight: 600 }}>
            {empresa.nombre}
          </p>
          <p className="text-[13px] text-[#6B7280] mt-0.5 date-caption">
            {empresa.nit}
          </p>
        </div>
        <span className={`inline-flex items-center h-[22px] px-2.5 rounded-[6px] text-[12px] whitespace-nowrap shrink-0 ${cls}`}
          style={{ ...OF, fontWeight: 600 }}>
          {label}
        </span>
      </div>

      {/* Sector tag */}
      {empresa.sector && (
        <div className="px-5 pb-3">
          <span
            className="inline-flex items-center h-6 px-2.5 rounded-md bg-[#F3F4F6] border border-[#E8ECF0] text-[13px] text-[#374151]"
            style={{ ...OF, fontWeight: 500 }}
          >
            {empresa.sector}
          </span>
        </div>
      )}

      <div className="mx-5 h-px bg-[#F0F4F8]" />

      {/* Extract */}
      <div className="px-5 py-3 flex-1">
        <p
          className="text-[14px] text-[#6B7280] leading-relaxed"
          style={{
            ...OF,
            fontWeight: 500,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {extract}
        </p>
      </div>

      <div className="mx-5 h-px bg-[#F0F4F8]" />

      {/* Footer buttons */}
      <div className="flex gap-2 p-4 pt-3">
        <Link
          href={`/dashboard/empresas/${empresa.id}`}
          className="flex-1 flex items-center justify-center h-8 rounded-lg border border-[#E5E7EB] bg-white text-[13px] text-[#374151] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-colors"
          style={{ ...OF, fontWeight: 600 }}
          onClick={(e) => e.stopPropagation()}
        >
          Ver detalle
        </Link>
        <Link
          href={`/dashboard/empresas/${empresa.id}`}
          className={[
            'flex-1 flex items-center justify-center h-8 rounded-lg text-[13px] transition-colors',
            isProcessing
              ? 'bg-[#FEF0ED] text-[#E8593C] opacity-40 pointer-events-none'
              : 'bg-[#FEF0ED] text-[#E8593C] hover:bg-[#FDDDD6]',
          ].join(' ')}
          style={{ ...OF, fontWeight: 600 }}
          aria-disabled={isProcessing}
          tabIndex={isProcessing ? -1 : 0}
        >
          Ver análisis Claude
        </Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteRequest() }}
          className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[13px] bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] transition-colors shrink-0"
          style={{ ...OF, fontWeight: 600 }}
          aria-label={`Eliminar empresa ${empresa.nombre}`}
        >
          <Trash2 size={13} />
          Eliminar
        </button>
      </div>
    </div>
  )
}

export default function EmpresasPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const [empresas, setEmpresas] = useState<EmpresaListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    fetch(`${API}/api/empresas`, { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 401) { router.push('/login'); return }
        if (!res.ok) throw new Error(`${res.status}`)
        setEmpresas(await res.json() as EmpresaListItem[])
      })
      .catch(() => setError('No se pudieron cargar las empresas.'))
      .finally(() => setIsLoading(false))
  }, [session, router])

  async function handleDeleteEmpresa() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await api.empresas.delete(deleteTarget.id)
      setEmpresas(prev => prev.filter(e => e.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('No se pudo eliminar la empresa. Intenta de nuevo.')
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  if (sessionPending) return null
  if (!session) return null

  return (
    <>
    {deleteTarget && (
      <ConfirmDeleteModal
        nombre={deleteTarget.nombre}
        mensaje="Esta acción no se puede deshacer. Se eliminarán también sus comparaciones y análisis."
        isDeleting={isDeleting}
        onConfirm={handleDeleteEmpresa}
        onCancel={() => setDeleteTarget(null)}
      />
    )}
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] text-[#111827]" style={{ ...OF, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Empresas
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1" style={{ ...OF, fontWeight: 500 }}>
              {isLoading ? 'Cargando...' : `${empresas.length} ${empresas.length === 1 ? 'empresa registrada' : 'empresas registradas'}`}
            </p>
          </div>
          <Link
            href="/dashboard/empresas/nueva"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[14px] bg-terracotta text-white hover:bg-terracotta-hover transition-colors shadow-[0_1px_3px_rgba(232,89,60,0.3)]"
            style={{ ...OF, fontWeight: 600 }}
          >
            <Plus size={14} />
            Nueva empresa
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#FEE2E2] border border-[#DC2626]/20 text-[14px] text-[#DC2626]" style={OF}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }, (_, i) => i).map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : empresas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
              <Plus size={24} color="#374151" />
            </div>
            <p className="text-[16px] text-[#111827] mb-2" style={{ ...OF, fontWeight: 600 }}>Sin empresas registradas</p>
            <p className="text-[14px] text-[#6B7280] text-center max-w-xs leading-relaxed mb-6" style={{ ...OF, fontWeight: 500 }}>
              Agrega las empresas de tus clientes para analizar licitaciones del SECOP II.
            </p>
            <Link
              href="/dashboard/empresas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
              style={{ ...OF, fontWeight: 600 }}
            >
              <Plus size={14} />
              Agregar primera empresa
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {empresas.map((e) => <EmpresaCard key={e.id} empresa={e} onDeleteRequest={() => setDeleteTarget({ id: e.id, nombre: e.nombre })} />)}
          </div>
        )}
      </div>
    </div>
    </>
  )
}
