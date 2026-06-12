'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import type { ComparacionConEmpresa, PliegoListItem } from '@/lib/types'
import { FileCheck, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface PliegoGroup {
  pliego: PliegoListItem
  comparaciones: ComparacionConEmpresa[]
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-border" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 bg-border rounded w-48" />
          <div className="h-3 bg-border rounded w-28" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-t border-border">
          <div className="h-3 bg-border rounded w-32" />
          <div className="h-5 bg-border rounded-full w-16" />
        </div>
      ))}
    </div>
  )
}

function EstadoAnexos({ estado }: { estado: string | null }) {
  if (estado === 'listo') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success"><CheckCircle2 size={11} /> Listo</span>
  }
  if (estado === 'procesando') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber"><Clock size={11} /> Generando</span>
  }
  if (estado === 'error') {
    return <span className="inline-flex items-center gap-1 text-[10px] font-medium text-terracotta"><AlertCircle size={11} /> Error</span>
  }
  return <span className="text-[10px] text-ink-3">Sin generar</span>
}

function PliegoCard({ group }: { group: PliegoGroup }) {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-ochre-dim flex items-center justify-center shrink-0">
          <FileCheck size={14} className="text-ochre" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-ink truncate">{group.pliego.nombre}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">{formatDate(group.pliego.created_at)}</p>
        </div>
        <Link
          href={`/dashboard/pliegos/${group.pliego.id}`}
          className="text-[11px] text-ink-3 hover:text-ink-2 transition-colors flex items-center gap-1 shrink-0"
        >
          Ver pliego <ChevronRight size={11} />
        </Link>
      </div>
      <div>
        {group.comparaciones.map((c, i) => (
          <Link
            key={c.empresa_id}
            href={`/dashboard/pliegos/${group.pliego.id}/anexos?empresaId=${c.empresa_id}`}
            className={`flex items-center gap-3 py-2.5 hover:bg-bg transition-colors -mx-1 px-1 rounded ${i > 0 ? 'border-t border-border-subtle' : ''} group`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-ink truncate">{c.empresa_nombre}</p>
            </div>
            <EstadoAnexos estado={null} />
            <ChevronRight size={12} className="text-ink-3 group-hover:text-ink-2 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function AnexosPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<PliegoGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    Promise.all([api.comparaciones.list(), api.pliegos.list()])
      .then(([comparaciones, pliegos]) => {
        const pliegosListo = pliegos.filter((p) => p.estado === 'listo')
        const g = pliegosListo.map((p) => ({
          pliego: p,
          comparaciones: comparaciones.filter((c) => c.pliego_id === p.id),
        })).filter((group) => group.comparaciones.length > 0)
        setGroups(g)
      })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) return null
  if (!session) return null

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="mb-8">
          <h1 className="text-[22px] font-bold text-ink" style={{ letterSpacing: '-0.01em' }}>Anexos</h1>
          <p className="text-[14px] text-ink-2 mt-1">Genera los documentos de la oferta para cada empresa y pliego</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-terracotta-dim border border-terracotta/20 text-[13px] text-terracotta">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 max-w-2xl">
            {[0, 1].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-ochre-dim flex items-center justify-center mb-4">
              <FileCheck size={24} className="text-ochre" />
            </div>
            <p className="text-[16px] font-semibold text-ink mb-2">Sin comparaciones analizadas</p>
            <p className="text-[13px] text-ink-2 text-center max-w-xs leading-relaxed mb-6">
              Analiza un pliego y compáralo con tus empresas para generar los anexos de la oferta.
            </p>
            <Link
              href="/dashboard/pliegos"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
            >
              Ver pliegos
            </Link>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            <p className="text-[13px] text-ink-2 mb-2">
              Selecciona un pliego y una empresa para generar los anexos de la oferta.
            </p>
            {groups.map((group) => <PliegoCard key={group.pliego.id} group={group} />)}
          </div>
        )}
      </div>
    </div>
  )
}
