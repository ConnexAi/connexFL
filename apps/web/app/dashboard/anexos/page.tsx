'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import type { ComparacionConEmpresa, PliegoListItem } from '@/lib/types'
import { FileText, FileDown, Download } from 'lucide-react'

const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface PliegoGroup {
  pliego: PliegoListItem
  comparaciones: ComparacionConEmpresa[]
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E8ECF0] p-6 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="h-5 bg-[#F3F4F6] rounded w-56" />
      <div className="h-px bg-[#F0F4F8]" />
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-4 h-4 bg-[#F3F4F6] rounded shrink-0" />
          <div className="h-3.5 bg-[#F3F4F6] rounded flex-1" />
          <div className="h-3 bg-[#F3F4F6] rounded w-20" />
          <div className="h-7 bg-[#F3F4F6] rounded-lg w-24" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PliegoCard
// ---------------------------------------------------------------------------

function PliegoCard({ group }: { group: PliegoGroup }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8ECF0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-[#F0F4F8]">
        <p className="text-[16px] text-[#111827]" style={{ ...OF, fontWeight: 600 }}>
          {group.pliego.nombre}
        </p>
        {group.pliego.entidad && (
          <p className="text-[13px] text-[#6B7280] mt-0.5" style={{ ...OF, fontWeight: 400 }}>
            {group.pliego.entidad}
          </p>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#F0F4F8]">
        {group.comparaciones.map((c) => (
          <div key={c.empresa_id} className="flex items-center gap-3 px-6 py-3.5">
            <FileText size={14} color="#374151" className="shrink-0" />
            <span className="flex-1 min-w-0 text-[14px] text-[#111827] truncate" style={{ ...OF, fontWeight: 500 }}>
              {c.empresa_nombre}
            </span>
            <span className="text-[13px] text-[#9CA3AF] shrink-0" style={{ ...OF, fontWeight: 400 }}>
              {formatDate(c.created_at)}
            </span>
            <Link
              href={`/dashboard/pliegos/${group.pliego.id}/anexos?empresaId=${c.empresa_id}`}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[13px] shrink-0 transition-colors hover:opacity-80"
              style={{ ...OF, fontWeight: 600, background: '#FEF0ED', color: '#E8593C' }}
            >
              <Download size={12} />
              Descargar
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
        const g = pliegosListo
          .map((p) => ({
            pliego: p,
            comparaciones: comparaciones.filter((c) => c.pliego_id === p.id),
          }))
          .filter((group) => group.comparaciones.length > 0)
        setGroups(g)
      })
      .catch(() => setError('No se pudieron cargar los datos.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) return null
  if (!session) return null

  const totalDocumentos = groups.reduce((sum, g) => sum + g.comparaciones.length, 0)

  return (
    <div className="flex-1 overflow-auto" style={{ background: '#F4F6F8' }}>
      <div className="max-w-[860px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[24px] text-[#111827]" style={{ ...OF, fontWeight: 700, letterSpacing: '-0.01em' }}>
            Anexos
          </h1>
          <p className="text-[14px] text-[#6B7280] mt-1" style={{ ...OF, fontWeight: 400 }}>
            {isLoading
              ? 'Cargando...'
              : `${totalDocumentos} ${totalDocumentos === 1 ? 'documento generado' : 'documentos generados'}`}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-[13px]"
            style={{ background: '#FEE2E2', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', ...OF }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[0, 1].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <FileDown size={48} color="#D1D5DB" className="mb-5" />
            <p className="text-[16px] text-[#111827] mb-1.5" style={{ ...OF, fontWeight: 600 }}>
              No hay anexos generados aún
            </p>
            <p className="text-[14px] text-[#6B7280] text-center max-w-xs leading-relaxed mb-6" style={{ ...OF, fontWeight: 400 }}>
              Analiza una licitación y compárala con tus empresas para generar los documentos de la oferta.
            </p>
            <Link
              href="/dashboard/licitaciones"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] transition-colors hover:opacity-90"
              style={{ ...OF, fontWeight: 600, background: '#E8593C', color: 'white' }}
            >
              Ir a licitaciones →
            </Link>
          </div>
        )}

        {/* Groups */}
        {!isLoading && groups.length > 0 && (
          <div className="space-y-4">
            {groups.map((group) => (
              <PliegoCard key={group.pliego.id} group={group} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
