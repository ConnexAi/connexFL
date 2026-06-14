'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'
import { api } from '@/lib/api'
import type { ComparacionConEmpresa, PliegoListItem } from '@/lib/types'
import { FileText, ChevronRight, Plus } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

const OF = { fontFamily: 'var(--font-outfit, Outfit, sans-serif)' }

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.toLocaleString('es-CO', { month: 'short' }).replace(/\./g, '')
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

interface PliegoGroup {
  pliegoId: string
  pliegoNombre: string
  analisisDate: string
  comparaciones: ComparacionConEmpresa[]
}

function buildGroups(comparaciones: ComparacionConEmpresa[], pliegosMap: Map<string, PliegoListItem>): PliegoGroup[] {
  const map = new Map<string, ComparacionConEmpresa[]>()
  for (const c of comparaciones) {
    const arr = map.get(c.pliego_id) ?? []
    arr.push(c)
    map.set(c.pliego_id, arr)
  }
  const groups: PliegoGroup[] = []
  for (const [pliegoId, items] of map.entries()) {
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    const pliego = pliegosMap.get(pliegoId)
    const analisisDate = items.reduce((latest, c) => c.created_at > latest ? c.created_at : latest, '')
    groups.push({
      pliegoId,
      pliegoNombre: pliego?.nombre ?? `Pliego ${pliegoId.slice(0, 8)}`,
      analisisDate,
      comparaciones: items,
    })
  }
  groups.sort((a, b) => b.analisisDate.localeCompare(a.analisisDate))
  return groups
}

function scoreColor(score: number | null): string {
  if (score === null) return '#9CA3AF'
  if (score >= 70) return '#059669'
  if (score >= 50) return '#D97706'
  return '#DC2626'
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center justify-center w-9 h-6 rounded-full text-[12px] bg-[#F3F4F6] text-[#9CA3AF]"
        style={{ ...OF, fontWeight: 600 }}>—</span>
    )
  }
  const bg = score >= 70 ? '#DCFCE7' : score >= 50 ? '#FEF9C3' : '#FEE2E2'
  const color = score >= 70 ? '#15803D' : score >= 50 ? '#854D0E' : '#DC2626'
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-6 rounded-full text-[12px]"
      style={{ ...OF, fontWeight: 600, background: bg, color }}
    >
      {score}
    </span>
  )
}

function RecPill({ score }: { score: number | null }) {
  if (score === null) return null
  const { label, bg, color } =
    score >= 70
      ? { label: 'Participar', bg: '#DCFCE7', color: '#15803D' }
      : score >= 50
        ? { label: 'Revisar', bg: '#FEF9C3', color: '#854D0E' }
        : { label: 'No participar', bg: '#FEE2E2', color: '#DC2626' }
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-[5px] text-[12px] whitespace-nowrap"
      style={{ ...OF, fontWeight: 600, background: bg, color }}
    >
      {label}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-4 animate-pulse shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-border rounded w-48" />
          <div className="h-3 bg-border rounded w-24" />
        </div>
        <div className="h-7 bg-border rounded-md w-24" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-6 w-9 bg-border rounded-full" />
          <div className="h-5 w-16 bg-border rounded-full" />
          <div className="h-4 bg-border rounded flex-1" />
        </div>
      ))}
    </div>
  )
}

function PliegoCard({ group }: { group: PliegoGroup }) {
  const chartData = group.comparaciones
    .filter((c) => c.score !== null)
    .map((c) => ({
      name: c.empresa_nombre.length > 18 ? c.empresa_nombre.slice(0, 18) + '…' : c.empresa_nombre,
      score: c.score as number,
    }))

  return (
    <div className="bg-surface rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0 mt-0.5">
            <FileText size={14} color="#374151" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] text-[#111827] truncate" style={{ ...OF, fontWeight: 600 }}>{group.pliegoNombre}</p>
            <p className="text-[13px] text-[#6B7280] mt-0.5 date-caption">Analizado el {formatDate(group.analisisDate)}</p>
          </div>
        </div>
        <Link
          href={`/dashboard/pliegos/${group.pliegoId}`}
          className="flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg text-[13px] text-[#374151] border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
          style={{ ...OF, fontWeight: 600 }}
        >
          Ver licitación
          <ChevronRight size={12} />
        </Link>
      </div>

      {/* 2-col body */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 40%' }}>
        {/* Left: lista empresas */}
        <div className="border-r border-border">
          {group.comparaciones.map((c, i) => (
            <div
              key={c.empresa_id}
              className={`flex items-center gap-3 px-5 py-3 ${i < group.comparaciones.length - 1 ? 'border-b border-[#F0F4F8]' : ''}`}
            >
              <div
                className="w-8 h-8 rounded-[8px] bg-[#F3F4F6] flex items-center justify-center shrink-0"
              >
                <span style={{ ...OF, fontWeight: 700, fontSize: 11, color: '#374151', lineHeight: 1 }}>
                  {c.empresa_nombre.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[#111827] truncate" style={{ ...OF, fontWeight: 600 }}>{c.empresa_nombre}</p>
                {c.nit && (
                  <p className="text-[12px] text-[#6B7280] mt-0.5 date-caption">{c.nit}</p>
                )}
              </div>
              <ScoreBadge score={c.score} />
              <RecPill score={c.score} />
              <span
                className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px]"
                style={{
                  ...OF,
                  fontWeight: 600,
                  background: c.ronda === 'pliego_definitivo' ? '#FEF0ED' : '#F3F4F6',
                  color: c.ronda === 'pliego_definitivo' ? '#E8593C' : '#374151',
                }}
              >
                {c.ronda === 'pliego_definitivo' ? 'Definitivo' : 'Pre-pliego'}
              </span>
            </div>
          ))}
        </div>

        {/* Right: BarChart */}
        <div className="p-4 flex items-center" style={{ minHeight: Math.max(group.comparaciones.length * 52, 120) }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(group.comparaciones.length * 44, 100)}>
              <BarChart
                data={chartData}
                layout="vertical"
                barSize={16}
                margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={100}
                  tick={{ fontSize: 11, fill: '#6B7280', fontFamily: 'var(--font-outfit, Outfit, sans-serif)', fontWeight: 500 }}
                />
                <Tooltip
                  formatter={(value) => [value != null ? `${value} / 100` : '—', 'Score']}
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E8ECF0',
                    borderRadius: 8,
                    fontSize: 13,
                    fontFamily: 'var(--font-outfit, Outfit, sans-serif)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={scoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[13px] text-[#9CA3AF] text-center w-full" style={OF}>Sin scores</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ComparacionesPage() {
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
        const pliegosMap = new Map(pliegos.map((p) => [p.id, p]))
        setGroups(buildGroups(comparaciones, pliegosMap))
      })
      .catch(() => setError('No se pudieron cargar las comparaciones.'))
      .finally(() => setIsLoading(false))
  }, [session])

  if (sessionPending) return null
  if (!session) return null

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1280px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[26px] text-[#111827]" style={{ ...OF, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Comparaciones
            </h1>
            <p className="text-[14px] text-[#6B7280] mt-1" style={{ ...OF, fontWeight: 500 }}>
              Compatibilidad empresa–pliego con ranking de score
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#FEE2E2] border border-[#DC2626]/20 text-[14px] text-[#DC2626]" style={OF}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-4">
              <FileText size={24} color="#374151" />
            </div>
            <p className="text-[16px] text-[#111827] mb-2" style={{ ...OF, fontWeight: 600 }}>Sin comparaciones todavía</p>
            <p className="text-[14px] text-[#6B7280] text-center max-w-xs leading-relaxed mb-6" style={{ ...OF, fontWeight: 500 }}>
              Analiza un pliego para ver el ranking de compatibilidad de tus empresas.
            </p>
            <Link
              href="/dashboard/licitaciones/nueva"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[14px] bg-terracotta text-white hover:bg-terracotta-hover transition-colors"
              style={{ ...OF, fontWeight: 600 }}
            >
              <Plus size={14} />
              Subir pliego
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => <PliegoCard key={group.pliegoId} group={group} />)}
          </div>
        )}
      </div>
    </div>
  )
}
