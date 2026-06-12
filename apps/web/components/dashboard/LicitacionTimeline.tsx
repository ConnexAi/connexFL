'use client'

import { useState } from 'react'
import Link from 'next/link'
import type {
  LicitacionFase,
  LicitacionAnalisis,
  LicitacionAnalisisEmpresa,
  TipoFase,
  ComparacionConEmpresa,
} from '@/lib/types'
import { api } from '@/lib/api'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const FASES_ORDEN: Array<{ tipo: TipoFase; label: string }> = [
  { tipo: 'prepliego',                label: 'Pre-pliego' },
  { tipo: 'pliego_definitivo',        label: 'Pliego definitivo' },
  { tipo: 'anexos',                   label: 'Anexos' },
  { tipo: 'evaluacion_observaciones', label: 'Evaluación y observaciones' },
]

const VEREDICTO_CONFIG = {
  cabe:                   { label: 'Cumple', cls: 'bg-green-dim text-green-700' },
  no_cabe:                { label: 'No cumple', cls: 'bg-terracotta-dim text-terracotta' },
  cabe_con_observaciones: { label: 'Con observaciones', cls: 'bg-amber-dim text-amber' },
  va:                     { label: 'Se recomienda', cls: 'bg-green-dim text-green-700' },
  no_va:                  { label: 'No se recomienda', cls: 'bg-terracotta-dim text-terracotta' },
  va_con_riesgos:         { label: 'Con riesgos', cls: 'bg-amber-dim text-amber' },
} as const

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  'bg-surface-2 text-ink-3',
  procesando: 'bg-amber-dim text-amber',
  listo:      'bg-ochre-dim text-ochre',
  error:      'bg-terracotta-dim text-terracotta',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', procesando: 'Procesando', listo: 'Listo', error: 'Error',
}

const CATEGORIA_LABELS: Record<string, string> = {
  juridico: 'Jurídico', financiero: 'Financiero', tecnico: 'Técnico', experiencia: 'Experiencia',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

// ---------------------------------------------------------------------------
// Íconos
// ---------------------------------------------------------------------------

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <path d="M3.5 6 8 10 12.5 6" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5v8M5 8l3 3 3-3" /><path d="M2.5 13.5h11" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="2.5" x2="8" y2="13.5" /><line x1="2.5" y1="8" x2="13.5" y2="8" />
    </svg>
  )
}

function IconSpark() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5 9.5 6.5 14.5 8 9.5 9.5 8 14.5 6.5 9.5 1.5 8 6.5 6.5 8 1.5Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Tabla de requisitos
// ---------------------------------------------------------------------------

function RequisitosTable({ requisitos }: {
  requisitos: NonNullable<LicitacionAnalisisEmpresa['requisitos']>
}) {
  return (
    <div className="overflow-x-auto rounded-[8px] border border-border-subtle text-[12px]">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="bg-surface border-b border-border-subtle text-ink-3 font-medium">
            <th className="text-left px-3 py-2">Categoría</th>
            <th className="text-left px-3 py-2">Requisito</th>
            <th className="text-left px-3 py-2">Estado</th>
            <th className="text-left px-3 py-2">Justificación</th>
          </tr>
        </thead>
        <tbody>
          {requisitos.map((r, i) => {
            const estadoCls = r.estado === 'cumple'
              ? 'text-green-700' : r.estado === 'no_cumple'
                ? 'text-terracotta' : 'text-amber'
            const estadoLabel = r.estado === 'cumple' ? 'Cumple' : r.estado === 'no_cumple' ? 'No cumple' : 'Dudoso'
            return (
              <tr key={i} className="border-b border-border-subtle last:border-0">
                <td className="px-3 py-2 text-ink-2 whitespace-nowrap">
                  {CATEGORIA_LABELS[r.categoria] ?? r.categoria}
                </td>
                <td className="px-3 py-2 text-ink">{r.requisito}</td>
                <td className={`px-3 py-2 font-medium whitespace-nowrap ${estadoCls}`}>{estadoLabel}</td>
                <td className="px-3 py-2 text-ink-2">{r.justificacion}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card de empresa analizada (sub-estado B)
// ---------------------------------------------------------------------------

interface EmpresaAnalisisCardProps {
  empresaId: string
  empresaNombre: string
  data: LicitacionAnalisisEmpresa
  licitacionId: string
  faseId: string
  tipoFase: TipoFase
}

function EmpresaAnalisisCard({ empresaId, empresaNombre, data, licitacionId, faseId, tipoFase }: EmpresaAnalisisCardProps) {
  const [expanded, setExpanded] = useState(false)

  const veredicto = data.veredicto_general ?? data.veredicto_final
  const verCfg = veredicto
    ? VEREDICTO_CONFIG[veredicto as keyof typeof VEREDICTO_CONFIG]
    : null

  const docxUrl = api.licitaciones.resumenDocxUrl(licitacionId, faseId, empresaId)

  return (
    <div className="border border-border-subtle rounded-[10px] bg-bg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors duration-150 text-left"
      >
        <span className="text-[13px] font-medium text-ink flex-1 truncate">{empresaNombre}</span>
        {verCfg && (
          <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium shrink-0 ${verCfg.cls}`}>
            {verCfg.label}
          </span>
        )}
        {tipoFase === 'evaluacion_observaciones' && data.puntaje_ponderacion !== undefined && (
          <span className="text-[11px] font-mono text-ink-3 shrink-0">{data.puntaje_ponderacion} pts</span>
        )}
        <IconChevron open={expanded} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-border-subtle space-y-4">
          {data.resumen_ejecutivo && (
            <p className="text-[13px] text-ink leading-relaxed">{data.resumen_ejecutivo}</p>
          )}

          {data.requisitos && data.requisitos.length > 0 && (
            <RequisitosTable requisitos={data.requisitos} />
          )}

          {data.fortalezas && data.fortalezas.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Fortalezas</p>
              <ul className="space-y-1 pl-3">
                {data.fortalezas.map((f, i) => (
                  <li key={i} className="text-[13px] text-ink before:content-['·'] before:mr-2 before:text-ink-3">{f}</li>
                ))}
              </ul>
            </div>
          )}

          {data.debilidades && data.debilidades.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Debilidades</p>
              <ul className="space-y-1 pl-3">
                {data.debilidades.map((d, i) => (
                  <li key={i} className="text-[13px] text-ink before:content-['·'] before:mr-2 before:text-ink-3">{d}</li>
                ))}
              </ul>
            </div>
          )}

          {data.recomendacion_anexos && (
            <div>
              <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Anexos recomendados</p>
              <p className="text-[13px] text-ink">{data.recomendacion_anexos}</p>
            </div>
          )}

          {data.oportunidades_observacion && data.oportunidades_observacion.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Oportunidades de observación</p>
              <ul className="space-y-2">
                {data.oportunidades_observacion.map((o, i) => (
                  <li key={i} className="text-[13px] text-ink">
                    <span className="text-ink-3 text-[11px] font-medium">[{o.tipo === 'puntaje_propio_subvalorado' ? 'Propio subvalorado' : 'Competidor cuestionable'}]</span>
                    {' '}{o.descripcion}: {o.argumento}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.observaciones_texto && (
            <details>
              <summary className="cursor-pointer text-[12px] text-ink-3 hover:text-ink-2">
                Ver observaciones formales completas
              </summary>
              <p className="mt-2 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">{data.observaciones_texto}</p>
            </details>
          )}

          {data.estrategia_texto && (
            <details>
              <summary className="cursor-pointer text-[12px] text-ink-3 hover:text-ink-2">
                Ver estrategia completa
              </summary>
              <p className="mt-2 text-[13px] text-ink leading-relaxed whitespace-pre-wrap">{data.estrategia_texto}</p>
            </details>
          )}

          <a
            href={docxUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border border-border-subtle hover:bg-surface text-ink-2 transition-colors duration-150"
          >
            <IconDownload />
            Descargar análisis (.docx)
          </a>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Selector de empresas (checkbox list)
// ---------------------------------------------------------------------------

interface EmpresaOption {
  id: string
  nombre: string
  score?: number | null
  afinidad?: string
}

interface EmpresaSelectorProps {
  opciones: EmpresaOption[]
  seleccionadas: Set<string>
  onToggle: (id: string) => void
  isLoading: boolean
  onSubmit: () => Promise<void>
  labelSubmit: string
}

function EmpresaSelector({ opciones, seleccionadas, onToggle, isLoading, onSubmit, labelSubmit }: EmpresaSelectorProps) {
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    setSending(true)
    try { await onSubmit() } finally { setSending(false) }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {opciones.map((emp) => (
          <label
            key={emp.id}
            className="flex items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-surface cursor-pointer transition-colors duration-150"
          >
            <input
              type="checkbox"
              checked={seleccionadas.has(emp.id)}
              onChange={() => onToggle(emp.id)}
              disabled={isLoading || sending}
              className="accent-terracotta w-3.5 h-3.5 shrink-0"
            />
            <span className="text-[13px] text-ink flex-1">{emp.nombre}</span>
            {emp.score !== undefined && emp.score !== null && (
              <span className="text-[11px] font-mono text-ink-3 shrink-0">{Math.round(emp.score)} pts</span>
            )}
            {emp.afinidad && (
              <span className="text-[11px] text-ink-3 truncate max-w-[200px] shrink-0">{emp.afinidad}</span>
            )}
          </label>
        ))}
        {opciones.length === 0 && (
          <p className="text-[13px] text-ink-3 px-3">Sin empresas disponibles.</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={seleccionadas.size === 0 || sending || isLoading}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium bg-terracotta text-white hover:bg-terracotta-hover transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <IconSpark />
        {sending ? 'Enviando…' : labelSubmit}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nodo Pre-pliego / Pliego definitivo (con sub-estados A/B)
// ---------------------------------------------------------------------------

interface FaseConAnalisisProps {
  fase: LicitacionFase
  licitacionId: string
  comparaciones: ComparacionConEmpresa[]      // para pliego_definitivo sub-estado A
  onAnalyzarEmpresas: (faseId: string, empresaIds: string[]) => Promise<void>
  onAgregar: () => void
}

function FaseConAnalisis({ fase, licitacionId, comparaciones, onAnalyzarEmpresas, onAgregar }: FaseConAnalisisProps) {
  const analisis = fase.analisis_claude as LicitacionAnalisis | null

  const generalData = analisis?.general
  const porEmpresaData = analisis?.por_empresa

  const hayGeneral   = Boolean(generalData)
  const hayEmpresas  = Boolean(porEmpresaData && Object.keys(porEmpresaData).length > 0)

  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())
  const [showSelector, setShowSelector] = useState(false)

  function toggleEmpresa(id: string) {
    setSeleccionadas(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleAnalyze() {
    await onAnalyzarEmpresas(fase.id, [...seleccionadas])
    setShowSelector(false)
    setSeleccionadas(new Set())
  }

  // Opciones para el selector
  const opcionesSelector: EmpresaOption[] =
    fase.tipo_fase === 'pliego_definitivo'
      ? comparaciones.map(c => ({ id: c.empresa_id, nombre: c.empresa_nombre, score: c.score }))
      : (generalData?.empresas_candidatas ?? []).map(ec => ({
          id: ec.empresa_id, nombre: ec.nombre_empresa, afinidad: ec.afinidad_resumen,
        }))

  // Estado: procesando
  if (fase.estado === 'procesando') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-amber-dim border border-amber/20">
        <span className="text-[12px] text-amber font-medium">Procesando…</span>
        <span className="text-[12px] text-amber">El análisis está en curso. Recarga en unos momentos.</span>
      </div>
    )
  }

  // Estado: error
  if (fase.estado === 'error') {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-[10px] bg-terracotta-dim border border-terracotta/20">
        <span className="text-[13px] text-terracotta">Error en el análisis</span>
        <button type="button" onClick={onAgregar} className="text-[12px] text-terracotta underline">Reintentar</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-estado A: análisis general */}
      {hayGeneral && generalData && (
        <div className="space-y-4">
          {/* Resumen ejecutivo */}
          {generalData.resumen_ejecutivo && (
            <div className="p-3 rounded-[8px] bg-ochre-dim border border-ochre/20">
              <p className="text-[11px] font-semibold text-ochre uppercase tracking-wide mb-1.5">Resumen ejecutivo</p>
              <p className="text-[13px] text-ink leading-relaxed">{generalData.resumen_ejecutivo}</p>
            </div>
          )}

          {/* Requisitos habilitantes (prepliego) */}
          {generalData.requisitos_habilitantes && (
            <details>
              <summary className="cursor-pointer text-[13px] font-medium text-ink-2 hover:text-ink list-none flex items-center gap-1.5">
                <span>Requisitos habilitantes</span>
                <span className="text-ink-3 text-[11px]">(expandir)</span>
              </summary>
              <div className="mt-2 space-y-2 pl-3">
                {Object.entries(generalData.requisitos_habilitantes).map(([cat, items]) => (
                  items && Array.isArray(items) && items.length > 0 ? (
                    <div key={cat}>
                      <p className="text-[11px] font-semibold text-ink-2 mb-1">{CATEGORIA_LABELS[cat] ?? cat}</p>
                      <ul className="space-y-0.5 pl-2">
                        {items.map((item: string, i: number) => (
                          <li key={i} className="text-[12px] text-ink before:content-['·'] before:mr-2 before:text-ink-3">{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                ))}
              </div>
            </details>
          )}

          {/* Criterios de ponderación */}
          {generalData.criterios_ponderacion && generalData.criterios_ponderacion.length > 0 && (
            <details>
              <summary className="cursor-pointer text-[13px] font-medium text-ink-2 hover:text-ink list-none flex items-center gap-1.5">
                <span>Criterios de ponderación</span>
                <span className="text-ink-3 text-[11px]">(expandir)</span>
              </summary>
              <ul className="mt-2 space-y-1 pl-3">
                {generalData.criterios_ponderacion.map((c, i) => (
                  <li key={i} className="text-[12px] text-ink before:content-['·'] before:mr-2 before:text-ink-3">
                    {c.criterio}: <span className="font-medium">{c.peso}%</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Fechas clave */}
          {generalData.fechas_clave && generalData.fechas_clave.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-1.5">Fechas clave</p>
              <ul className="space-y-1 pl-2">
                {generalData.fechas_clave.map((f, i) => (
                  <li key={i} className="text-[12px] text-ink">
                    <span className="font-mono text-ink-3">{f.fecha}</span> — {f.evento}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cascaritas */}
          {generalData.cascaritas && generalData.cascaritas.length > 0 && (
            <div className="p-3 rounded-[8px] bg-terracotta-dim border border-terracotta/20">
              <p className="text-[11px] font-semibold text-terracotta uppercase tracking-wide mb-1.5">Alertas ("cascaritas")</p>
              <ul className="space-y-1">
                {generalData.cascaritas.map((c, i) => (
                  <li key={i} className="text-[12px] text-ink">
                    {c.descripcion} — <span className="text-ink-3">{c.ubicacion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* comparaciones pliego_definitivo sub-estado A */}
          {fase.tipo_fase === 'pliego_definitivo' && comparaciones.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-2">Empresas analizadas</p>
              <div className="overflow-x-auto rounded-[8px] border border-border-subtle text-[12px]">
                <table className="w-full">
                  <thead>
                    <tr className="bg-surface border-b border-border-subtle text-ink-3 font-medium">
                      <th className="text-left px-3 py-2">Empresa</th>
                      <th className="text-right px-3 py-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparaciones
                      .slice()
                      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                      .map(c => (
                        <tr key={c.id} className="border-b border-border-subtle last:border-0">
                          <td className="px-3 py-2 text-ink">{c.empresa_nombre}</td>
                          <td className="px-3 py-2 text-right font-mono text-ink-2">
                            {c.score !== null ? `${Math.round(c.score ?? 0)}` : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botón docx general */}
          <a
            href={api.licitaciones.resumenDocxUrl(licitacionId, fase.id)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border border-border-subtle hover:bg-surface text-ink-2 transition-colors duration-150"
          >
            <IconDownload />
            Descargar resumen general (.docx)
          </a>

          {/* Selector de empresas */}
          {!showSelector && (
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-medium border border-terracotta text-terracotta hover:bg-terracotta-dim transition-colors duration-150"
            >
              <IconSpark />
              {hayEmpresas ? 'Analizar más empresas' : 'Analizar empresas seleccionadas'}
            </button>
          )}

          {showSelector && (
            <div className="border border-border-subtle rounded-[10px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-ink">Seleccionar empresas a analizar</p>
                <button
                  type="button"
                  onClick={() => { setShowSelector(false); setSeleccionadas(new Set()) }}
                  className="text-[12px] text-ink-3 hover:text-ink-2"
                >
                  Cancelar
                </button>
              </div>
              <EmpresaSelector
                opciones={opcionesSelector}
                seleccionadas={seleccionadas}
                onToggle={toggleEmpresa}
                isLoading={false}
                onSubmit={handleAnalyze}
                labelSubmit={`Analizar ${seleccionadas.size > 0 ? seleccionadas.size : ''} empresa${seleccionadas.size !== 1 ? 's' : ''}`}
              />
            </div>
          )}
        </div>
      )}

      {/* Sub-estado B: análisis por empresa */}
      {hayEmpresas && porEmpresaData && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide">Análisis por empresa</p>
          {Object.entries(porEmpresaData).map(([empId, empData]) => {
            const nombre =
              comparaciones.find(c => c.empresa_id === empId)?.empresa_nombre ??
              (generalData?.empresas_candidatas?.find(ec => ec.empresa_id === empId)?.nombre_empresa) ??
              empId.slice(0, 8)
            return (
              <EmpresaAnalisisCard
                key={empId}
                empresaId={empId}
                empresaNombre={nombre}
                data={empData}
                licitacionId={licitacionId}
                faseId={fase.id}
                tipoFase={fase.tipo_fase}
              />
            )
          })}
        </div>
      )}

      {/* Estado listo pero sin análisis aún */}
      {!hayGeneral && !hayEmpresas && (
        <p className="text-[13px] text-ink-3">Sin análisis disponible. Sube documentos para iniciar.</p>
      )}

      {/* Archivos adjuntos */}
      {fase.documentos_path && fase.documentos_path.length > 0 && (
        <details>
          <summary className="cursor-pointer text-[12px] text-ink-3 hover:text-ink-2 list-none flex items-center gap-1.5">
            {fase.documentos_path.length} documento{fase.documentos_path.length > 1 ? 's' : ''} adjunto{fase.documentos_path.length > 1 ? 's' : ''}
          </summary>
          <ul className="mt-1.5 space-y-0.5 pl-3">
            {fase.documentos_path.map((p, i) => (
              <li key={i} className="text-[12px] text-ink-2 font-mono">{basename(p)}</li>
            ))}
          </ul>
        </details>
      )}

      <button
        type="button"
        onClick={onAgregar}
        className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150"
      >
        <IconPlus />
        Agregar nueva versión
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nodo Anexos
// ---------------------------------------------------------------------------

function NodoAnexos({ comparacionesSeleccionadas }: { comparacionesSeleccionadas: ComparacionConEmpresa[] }) {
  if (comparacionesSeleccionadas.length === 0) {
    return (
      <div className="p-3 rounded-[10px] border border-border-subtle border-dashed text-center">
        <p className="text-[13px] text-ink-3">Selecciona empresas en "Pliego definitivo" para habilitar la generación de anexos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {comparacionesSeleccionadas.map(c => (
        <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-[10px] border border-border-subtle bg-bg">
          <div>
            <p className="text-[13px] font-medium text-ink">{c.empresa_nombre}</p>
            <p className="text-[12px] text-ink-3">{c.nit}</p>
          </div>
          <Link
            href={`/dashboard/pliegos/${c.pliego_id}/anexos`}
            className="text-[13px] text-terracotta hover:underline font-medium"
          >
            Generar / ver anexos →
          </Link>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nodo Evaluación y observaciones
// ---------------------------------------------------------------------------

interface NodoEvaluacionProps {
  fase: LicitacionFase | undefined
  licitacionId: string
  comparacionesSeleccionadas: ComparacionConEmpresa[]
  onAgregar: () => void
}

function NodoEvaluacion({ fase, licitacionId, comparacionesSeleccionadas, onAgregar }: NodoEvaluacionProps) {
  if (!fase) {
    return (
      <button
        type="button"
        onClick={onAgregar}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-ink-3 border border-dashed border-border-subtle hover:border-border hover:text-ink-2 transition-colors duration-150"
      >
        <IconPlus />
        Subir informe de evaluación y observaciones
      </button>
    )
  }

  const analisis = fase.analisis_claude as LicitacionAnalisis | null
  const general = analisis?.general
  const porEmpresa = analisis?.por_empresa

  if (fase.estado === 'procesando') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-amber-dim border border-amber/20">
        <span className="text-[12px] text-amber font-medium">Procesando análisis de evaluación…</span>
      </div>
    )
  }

  if (fase.estado === 'pendiente' || (!general && !porEmpresa)) {
    return (
      <div className="space-y-2">
        <div className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-medium ${ESTADO_BADGE[fase.estado] ?? 'bg-surface-2 text-ink-3'}`}>
          {ESTADO_LABEL[fase.estado] ?? fase.estado} · v{fase.version} · {formatDate(fase.fecha)}
        </div>
        <button
          type="button"
          onClick={onAgregar}
          className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150"
        >
          <IconPlus />
          Agregar nueva versión
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen general */}
      {general?.resumen_general && (
        <div className="p-3 rounded-[8px] bg-ochre-dim border border-ochre/20">
          <p className="text-[11px] font-semibold text-ochre uppercase tracking-wide mb-1.5">Análisis de evaluación</p>
          <p className="text-[13px] text-ink leading-relaxed">{general.resumen_general}</p>
        </div>
      )}

      {/* Ranking competidores */}
      {general?.ranking_competidores && general.ranking_competidores.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide mb-2">Ranking de competidores</p>
          <div className="overflow-x-auto rounded-[8px] border border-border-subtle text-[12px]">
            <table className="w-full">
              <thead>
                <tr className="bg-surface border-b border-border-subtle text-ink-3 font-medium">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">Proponente</th>
                  <th className="text-left px-3 py-2">Habilitante</th>
                  <th className="text-right px-3 py-2">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {general.ranking_competidores.map((r, i) => (
                  <tr key={i} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2 font-mono text-ink-3">{i + 1}</td>
                    <td className="px-3 py-2 text-ink">{r.nombre_proponente}</td>
                    <td className={`px-3 py-2 font-medium ${r.puntaje_habilitante === 'habilitado' ? 'text-green-700' : 'text-terracotta'}`}>
                      {r.puntaje_habilitante === 'habilitado' ? 'Habilitado' : 'No habilitado'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-ink-2">{r.puntaje_ponderacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards por empresa */}
      {porEmpresa && Object.keys(porEmpresa).length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-ink-2 uppercase tracking-wide">Análisis por empresa</p>
          {Object.entries(porEmpresa).map(([empId, empData]) => {
            const nombre =
              comparacionesSeleccionadas.find(c => c.empresa_id === empId)?.empresa_nombre ??
              empId.slice(0, 8)
            return (
              <EmpresaAnalisisCard
                key={empId}
                empresaId={empId}
                empresaNombre={nombre}
                data={empData}
                licitacionId={licitacionId}
                faseId={fase.id}
                tipoFase={fase.tipo_fase}
              />
            )
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onAgregar}
        className="flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 transition-colors duration-150"
      >
        <IconPlus />
        Agregar nueva versión
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Nodo genérico del timeline
// ---------------------------------------------------------------------------

interface TimelineNodeProps {
  tipo: TipoFase
  label: string
  isLast: boolean
  children: React.ReactNode
  hasFases: boolean
  onAgregar: () => void
}

function TimelineNode({ tipo, label, isLast, children, hasFases, onAgregar }: TimelineNodeProps) {
  const isEmpty = tipo !== 'anexos' && !hasFases

  return (
    <div className={`relative flex gap-5 ${!isLast ? 'pb-6' : ''}`}>
      {!isLast && <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-border-subtle" />}

      <div className="relative z-10 mt-0.5 shrink-0">
        <div className={[
          'w-5 h-5 rounded-full border-2 transition-colors duration-200',
          hasFases ? 'bg-terracotta border-terracotta' : 'bg-bg border-border',
        ].join(' ')} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[14px] font-semibold text-ink">{label}</span>
          {isEmpty && <span className="text-[11px] text-ink-3">Sin agregar</span>}
        </div>

        {isEmpty ? (
          <button
            type="button"
            onClick={onAgregar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-ink-3 border border-dashed border-border-subtle hover:border-border hover:text-ink-2 transition-colors duration-150"
          >
            <IconPlus />
            Agregar {label.toLowerCase()}
          </button>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export interface LicitacionTimelineProps {
  fases: LicitacionFase[]
  licitacionId: string
  pliegoId: string | null
  comparaciones: ComparacionConEmpresa[]
  onAgregarFase: (tipo: TipoFase) => void
  onAnalyzarEmpresas: (faseId: string, empresaIds: string[]) => Promise<void>
}

export default function LicitacionTimeline({
  fases,
  licitacionId,
  comparaciones,
  onAgregarFase,
  onAnalyzarEmpresas,
}: LicitacionTimelineProps) {
  const fasesDe = (tipo: TipoFase) =>
    fases.filter(f => f.tipo_fase === tipo).sort((a, b) => b.version - a.version)

  const comparacionesPliegoDefinitivo = comparaciones.filter(c => c.ronda === 'definitivo')
  const comparacionesSeleccionadas    = comparaciones.filter(c => c.ronda === 'definitivo' && c.seleccionada)

  return (
    <div className="py-2">
      {FASES_ORDEN.map(({ tipo, label }, idx) => {
        const fasesDelTipo = fasesDe(tipo)
        const ultimaFase  = fasesDelTipo[0]     // versión más reciente
        const isLast      = idx === FASES_ORDEN.length - 1

        if (tipo === 'anexos') {
          return (
            <TimelineNode
              key={tipo} tipo={tipo} label={label} isLast={isLast}
              hasFases={comparacionesSeleccionadas.length > 0}
              onAgregar={() => onAgregarFase(tipo)}
            >
              <NodoAnexos comparacionesSeleccionadas={comparacionesSeleccionadas} />
            </TimelineNode>
          )
        }

        if (tipo === 'evaluacion_observaciones') {
          return (
            <TimelineNode
              key={tipo} tipo={tipo} label={label} isLast={isLast}
              hasFases={fasesDelTipo.length > 0}
              onAgregar={() => onAgregarFase(tipo)}
            >
              <NodoEvaluacion
                fase={ultimaFase}
                licitacionId={licitacionId}
                comparacionesSeleccionadas={comparacionesSeleccionadas}
                onAgregar={() => onAgregarFase(tipo)}
              />
            </TimelineNode>
          )
        }

        // prepliego / pliego_definitivo
        const comparacionesFase = tipo === 'pliego_definitivo' ? comparacionesPliegoDefinitivo : []

        return (
          <TimelineNode
            key={tipo} tipo={tipo} label={label} isLast={isLast}
            hasFases={fasesDelTipo.length > 0}
            onAgregar={() => onAgregarFase(tipo)}
          >
            {ultimaFase ? (
              <FaseConAnalisis
                fase={ultimaFase}
                licitacionId={licitacionId}
                comparaciones={comparacionesFase}
                onAnalyzarEmpresas={onAnalyzarEmpresas}
                onAgregar={() => onAgregarFase(tipo)}
              />
            ) : null}
          </TimelineNode>
        )
      })}
    </div>
  )
}
