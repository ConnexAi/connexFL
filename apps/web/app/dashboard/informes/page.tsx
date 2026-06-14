'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import type { InformeEmpresa } from '@/lib/types'
import { FileBarChart, TrendingUp, TrendingDown, Minus, Download, ChevronDown } from 'lucide-react'

const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getLast6Months(): Array<{ value: string; label: string }> {
  const months: Array<{ value: string; label: string }> = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    months.push({ value, label })
  }
  return months
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[13px] text-[#9CA3AF]" style={OF}>Sin evaluar</span>
  const bg = score >= 70 ? '#DCFCE7' : score >= 40 ? '#FEF9C3' : '#FEE2E2'
  const color = score >= 70 ? '#15803D' : score >= 40 ? '#854D0E' : '#DC2626'
  return (
    <span
      className="inline-flex items-center justify-center h-6 min-w-[2.5rem] px-2 rounded-full text-[12px]"
      style={{ ...OF, fontWeight: 700, background: bg, color }}
    >
      {score}
    </span>
  )
}

function TrendBadge({ esteMs, mesAnterior }: { esteMs: number; mesAnterior: number }) {
  if (esteMs === 0 && mesAnterior === 0) return null
  if (esteMs > mesAnterior) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-[#15803D]" style={{ ...OF, fontWeight: 600 }}>
        <TrendingUp size={11} />
        +{esteMs - mesAnterior}
      </span>
    )
  }
  if (esteMs < mesAnterior) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-[#DC2626]" style={{ ...OF, fontWeight: 600 }}>
        <TrendingDown size={11} />
        {esteMs - mesAnterior}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-[#6B7280]" style={{ ...OF, fontWeight: 600 }}>
      <Minus size={11} />
      igual
    </span>
  )
}

function EmpresaCard({ empresa, selectedMes }: { empresa: InformeEmpresa; selectedMes: string }) {
  const [expanded, setExpanded] = useState(false)
  const downloadUrl = api.informes.downloadDocx(empresa.id, selectedMes)

  return (
    <div className="bg-white rounded-xl border border-[#E8ECF0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
              style={{ background: '#FEF0ED' }}
            >
              <span style={{ ...OF, fontWeight: 700, fontSize: 11, color: '#E8593C', lineHeight: 1 }}>
                {empresa.nombre.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
            </div>
            <p className="text-[15px] text-[#111827] truncate" style={{ ...OF, fontWeight: 600 }}>{empresa.nombre}</p>
          </div>
          {empresa.sector && (
            <p className="text-[12px] text-[#6B7280]" style={OF}>{empresa.sector}</p>
          )}
        </div>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] shrink-0 transition-colors hover:opacity-80"
          style={{ ...OF, fontWeight: 600, background: '#FEF0ED', color: '#E8593C' }}
        >
          <Download size={11} />
          Informe .docx
        </a>
      </div>

      {/* Stats row */}
      <div className="border-t border-[#F0F4F8] px-6 py-3 flex items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wide" style={{ ...OF, fontWeight: 600 }}>
            Total
          </span>
          <span className="text-[20px] text-[#111827] leading-none" style={{ ...OF, fontWeight: 700 }}>
            {empresa.total_evaluadas}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wide" style={{ ...OF, fontWeight: 600 }}>
            Este mes
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[20px] text-[#111827] leading-none" style={{ ...OF, fontWeight: 700 }}>
              {empresa.este_mes}
            </span>
            <TrendBadge esteMs={empresa.este_mes} mesAnterior={empresa.mes_anterior} />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wide" style={{ ...OF, fontWeight: 600 }}>
            Score prom.
          </span>
          <ScoreBar score={empresa.score_promedio} />
        </div>

        {empresa.ultimas_evaluaciones.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-auto flex items-center gap-1 text-[12px] text-[#6B7280] hover:text-[#374151] transition-colors"
            style={OF}
          >
            Últimas evaluaciones
            <ChevronDown
              size={13}
              className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Evaluaciones expandidas */}
      {expanded && empresa.ultimas_evaluaciones.length > 0 && (
        <div className="border-t border-[#F0F4F8]">
          {empresa.ultimas_evaluaciones.map((ev, i) => (
            <div
              key={ev.comparacion_id}
              className={`flex items-center gap-3 px-6 py-3 ${i < empresa.ultimas_evaluaciones.length - 1 ? 'border-b border-[#F0F4F8]' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#111827] truncate" style={{ ...OF, fontWeight: 500 }}>
                  {ev.nombre_licitacion}
                </p>
                <p className="text-[11px] text-[#9CA3AF]" style={OF}>{formatDate(ev.created_at)}</p>
              </div>
              <ScoreBar score={ev.score} />
              {ev.licitacion_id && (
                <Link
                  href={`/dashboard/licitaciones/${ev.licitacion_id}`}
                  className="text-[11px] text-[#E8593C] hover:underline shrink-0"
                  style={OF}
                >
                  Ver →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E8ECF0] p-6 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#F3F4F6] rounded-[8px]" />
          <div className="h-4 bg-[#F3F4F6] rounded w-40" />
        </div>
        <div className="h-7 bg-[#F3F4F6] rounded-lg w-28" />
      </div>
      <div className="h-px bg-[#F0F4F8]" />
      <div className="flex gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 bg-[#F3F4F6] rounded w-12" />
            <div className="h-6 bg-[#F3F4F6] rounded w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InformesPage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const router = useRouter()
  const [empresas, setEmpresas] = useState<InformeEmpresa[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const months = getLast6Months()
  const [selectedMes, setSelectedMes] = useState(months[0]?.value ?? '')
  const [monthMenuOpen, setMonthMenuOpen] = useState(false)

  useEffect(() => {
    if (!sessionPending && !session) router.push('/login')
  }, [session, sessionPending, router])

  useEffect(() => {
    if (!session) return
    setIsLoading(true)
    api.informes.listEmpresas()
      .then(setEmpresas)
      .catch(() => setError('No se pudieron cargar los informes.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) return null
  if (!session) return null

  const selectedLabel = months.find((m) => m.value === selectedMes)?.label ?? selectedMes

  const filteredEmpresas = empresas.filter(
    (e) => e.total_evaluadas > 0
  )

  return (
    <div className="flex-1 overflow-auto" style={{ background: '#F4F6F8' }}>
      <div className="max-w-[900px] mx-auto px-8 py-8">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[24px] text-[#111827]" style={{ ...OF, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Informes
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1" style={OF}>
              {isLoading
                ? 'Cargando...'
                : `${filteredEmpresas.length} ${filteredEmpresas.length === 1 ? 'empresa con evaluaciones' : 'empresas con evaluaciones'}`}
            </p>
          </div>

          {/* Month selector */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMonthMenuOpen((o) => !o)}
              className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-[#E5E7EB] bg-white text-[13px] text-[#374151] hover:border-[#D1D5DB] transition-colors"
              style={{ ...OF, fontWeight: 500 }}
            >
              <FileBarChart size={13} color="#9CA3AF" />
              {selectedLabel}
              <ChevronDown size={12} color="#9CA3AF" className={`transition-transform duration-150 ${monthMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {monthMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-1 z-20">
                {months.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setSelectedMes(m.value); setMonthMenuOpen(false) }}
                    className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors ${m.value === selectedMes ? 'text-[#E8593C] bg-[#FEF0ED]' : 'text-[#374151] hover:bg-[#F9FAFB]'}`}
                    style={{ ...OF, fontWeight: m.value === selectedMes ? 600 : 400 }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredEmpresas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <FileBarChart size={48} color="#D1D5DB" className="mb-5" />
            <p className="text-[16px] text-[#111827] mb-1.5" style={{ ...OF, fontWeight: 600 }}>
              Sin evaluaciones registradas
            </p>
            <p className="text-[14px] text-[#6B7280] text-center max-w-xs leading-relaxed mb-6" style={{ ...OF, fontWeight: 400 }}>
              Analiza licitaciones y compáralas con tus empresas para generar informes.
            </p>
            <Link
              href="/dashboard/pliegos"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] transition-colors hover:opacity-90"
              style={{ ...OF, fontWeight: 600, background: '#E8593C', color: 'white' }}
            >
              Ir a licitaciones →
            </Link>
          </div>
        )}

        {/* Cards */}
        {!isLoading && filteredEmpresas.length > 0 && (
          <div className="space-y-4">
            {filteredEmpresas.map((empresa) => (
              <EmpresaCard key={empresa.id} empresa={empresa} selectedMes={selectedMes} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
