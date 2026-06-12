import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx'

// ---------------------------------------------------------------------------
// Tipos locales (reflejo de LicitacionAnalisis de @connex/db)
// ---------------------------------------------------------------------------

interface LicitacionRequisito {
  categoria?: 'juridico' | 'financiero' | 'tecnico' | 'experiencia'
  requisito?: string
  estado?: 'cumple' | 'no_cumple' | 'dudoso'
  justificacion?: string
}

interface LicitacionAnalisisEmpresa {
  veredicto_general?: 'cabe' | 'no_cabe' | 'cabe_con_observaciones'
  veredicto_final?: 'va' | 'no_va' | 'va_con_riesgos'
  resumen_ejecutivo?: string
  requisitos?: LicitacionRequisito[]
  observaciones_texto?: string
  fortalezas?: string[]
  debilidades?: string[]
  recomendacion_anexos?: string
  puntaje_ponderacion?: number
  ranking?: number
  oportunidades_observacion?: {
    tipo: 'puntaje_propio_subvalorado' | 'puntaje_competidor_cuestionable'
    descripcion: string
    argumento: string
  }[]
  estrategia_texto?: string
}

interface LicitacionAnalisisGeneral {
  resumen_ejecutivo?: string
  requisitos_habilitantes?: {
    juridico?: string[]
    financiero?: string[]
    tecnico?: string[]
    experiencia?: string[]
  }
  criterios_ponderacion?: { criterio: string; peso: number }[]
  fechas_clave?: { fecha: string; evento: string }[]
  cascaritas?: { descripcion: string; ubicacion: string }[]
  empresas_candidatas?: { empresa_id: string; nombre_empresa: string; afinidad_resumen: string }[]
  resumen_general?: string
  ranking_competidores?: {
    nombre_proponente: string
    puntaje_habilitante: 'habilitado' | 'no_habilitado'
    puntaje_ponderacion: number
    observaciones_detectadas: string
  }[]
}

interface LicitacionAnalisis {
  general?: LicitacionAnalisisGeneral
  por_empresa?: { [empresaId: string]: LicitacionAnalisisEmpresa }
}

// ---------------------------------------------------------------------------
// Mapas de etiquetas
// ---------------------------------------------------------------------------

const TIPO_FASE_LABELS: Record<string, string> = {
  prepliego:                'Pre-pliego',
  pliego_definitivo:        'Pliego definitivo',
  anexos:                   'Anexos',
  evaluacion_observaciones: 'Evaluación y observaciones',
  estudio_previo:           'Estudio previo',
  borrador_pliego:          'Borrador de pliego',
  respuesta_observaciones:  'Respuesta a observaciones',
  audiencia_riesgos:        'Audiencia de riesgos',
  presentacion_ofertas:     'Presentación de ofertas',
  adjudicacion:             'Adjudicación',
}

const VEREDICTO_LABELS: Record<string, string> = {
  cabe:                   'Cumple requisitos',
  no_cabe:                'No cumple requisitos',
  cabe_con_observaciones: 'Cumple con observaciones',
  va:                     'Se recomienda presentar oferta',
  no_va:                  'No se recomienda presentar oferta',
  va_con_riesgos:         'Presentar con observaciones',
}

const ESTADO_REQUISITO_LABELS: Record<string, string> = {
  cumple:    'Cumple',
  no_cumple: 'No cumple',
  dudoso:    'Dudoso',
}

const CATEGORIA_LABELS: Record<string, string> = {
  juridico:    'Jurídico',
  financiero:  'Financiero',
  tecnico:     'Técnico',
  experiencia: 'Experiencia',
}

const ANALISIS_KEY_LABELS: Record<string, string> = {
  resumen:                 'Resumen',
  requisitos_habilitantes: 'Requisitos habilitantes',
  criterios_ponderacion:   'Criterios de ponderación',
  fechas_clave:            'Fechas clave',
  inconsistencias:         'Inconsistencias',
  fortalezas:              'Fortalezas',
  debilidades:             'Debilidades',
  veredicto:               'Veredicto',
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface ResumenDocxOptions {
  nombreLicitacion: string
  secopId: string | null
  tipoFase: string
  version: number
  fecha: Date | string | null
  resumenEjecutivo: string | null
  analisisClaude: Record<string, unknown> | null
  empresaId?: string
  empresaNombre?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFechaES(d: Date | string | null | undefined): string {
  if (!d) return 'Sin fecha'
  return new Date(d as Date).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function blankPara(): Paragraph {
  return new Paragraph({ children: [] })
}

function heading2(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2 })
}

function heading3(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3 })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}` })],
    indent: { left: 360 },
  })
}

function bodyText(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text })] })
}

function valueToLines(value: unknown): Paragraph[] {
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => {
      const txt =
        typeof item === 'string'
          ? item
          : typeof item === 'object' && item !== null
            ? Object.entries(item as Record<string, unknown>)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join('   |   ')
            : String(item)
      return bullet(txt)
    })
  }
  if (typeof value === 'string') return [bodyText(value)]
  if (typeof value === 'number' || typeof value === 'boolean') return [bodyText(String(value))]
  return [bodyText(JSON.stringify(value))]
}

// ---------------------------------------------------------------------------
// Tabla de requisitos habilitantes
// ---------------------------------------------------------------------------

function makeRequisitosTable(rows: LicitacionRequisito[]): Table {
  const headerRow = new TableRow({
    children: ['Categoría', 'Requisito', 'Estado', 'Justificación'].map(
      (txt) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: txt, bold: true })] })],
          shading: { type: ShadingType.SOLID, color: 'F0F0F0' },
        })
    ),
  })

  const dataRows = rows.map(
    (r) =>
      new TableRow({
        children: [
          new TableCell({ children: [bodyText(CATEGORIA_LABELS[r.categoria ?? ''] ?? (r.categoria ?? ''))] }),
          new TableCell({ children: [bodyText(r.requisito ?? '')] }),
          new TableCell({ children: [bodyText(ESTADO_REQUISITO_LABELS[r.estado ?? ''] ?? (r.estado ?? ''))] }),
          new TableCell({ children: [bodyText(r.justificacion ?? '')] }),
        ],
      })
  )

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
    },
  })
}

// ---------------------------------------------------------------------------
// Renderizar bloque "general"
// ---------------------------------------------------------------------------

function renderGeneral(children: Paragraph[], general: LicitacionAnalisisGeneral | undefined): void {
  if (!general) return

  if (general.resumen_ejecutivo) {
    children.push(heading2('Resumen ejecutivo'), bodyText(general.resumen_ejecutivo), blankPara())
  }

  if (general.requisitos_habilitantes) {
    children.push(heading2('Requisitos habilitantes'))
    for (const [cat, items] of Object.entries(general.requisitos_habilitantes)) {
      if (!items || !Array.isArray(items) || items.length === 0) continue
      children.push(heading3(CATEGORIA_LABELS[cat] ?? cat))
      ;(items as string[]).forEach((item) => children.push(bullet(item)))
      children.push(blankPara())
    }
  }

  if (general.criterios_ponderacion && general.criterios_ponderacion.length > 0) {
    children.push(heading2('Criterios de ponderación'))
    general.criterios_ponderacion.forEach((c) => children.push(bullet(`${c.criterio}: ${c.peso}%`)))
    children.push(blankPara())
  }

  if (general.fechas_clave && general.fechas_clave.length > 0) {
    children.push(heading2('Fechas clave'))
    general.fechas_clave.forEach((f) => children.push(bullet(`${f.fecha}: ${f.evento}`)))
    children.push(blankPara())
  }

  if (general.cascaritas && general.cascaritas.length > 0) {
    children.push(heading2('Alertas ("cascaritas")'))
    general.cascaritas.forEach((c) => children.push(bullet(`${c.descripcion} — ${c.ubicacion}`)))
    children.push(blankPara())
  }

  if (general.resumen_general) {
    children.push(heading2('Análisis de evaluación'), bodyText(general.resumen_general), blankPara())
  }

  if (general.ranking_competidores && general.ranking_competidores.length > 0) {
    children.push(heading2('Ranking de competidores'))
    general.ranking_competidores.forEach((r, i) =>
      children.push(
        bullet(`${i + 1}. ${r.nombre_proponente} — ${r.puntaje_ponderacion} pts (${r.puntaje_habilitante})${r.observaciones_detectadas ? ': ' + r.observaciones_detectadas : ''}`)
      )
    )
    children.push(blankPara())
  }
}

// ---------------------------------------------------------------------------
// Renderizar bloque por_empresa[empresaId]
// ---------------------------------------------------------------------------

function renderPorEmpresa(children: Paragraph[], data: LicitacionAnalisisEmpresa): void {
  const veredicto = data.veredicto_general ?? data.veredicto_final
  if (veredicto) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Veredicto: ', bold: true }),
          new TextRun({ text: VEREDICTO_LABELS[veredicto] ?? veredicto, bold: true }),
        ],
      }),
      blankPara()
    )
  }

  if (data.resumen_ejecutivo) {
    children.push(heading2('Análisis ejecutivo'), bodyText(data.resumen_ejecutivo), blankPara())
  }

  if (data.requisitos && data.requisitos.length > 0) {
    children.push(heading2('Requisitos habilitantes'), blankPara())
    const tabla = makeRequisitosTable(data.requisitos) as unknown as Paragraph
    children.push(tabla, blankPara())
  }

  if (data.fortalezas && data.fortalezas.length > 0) {
    children.push(heading2('Fortalezas'))
    data.fortalezas.forEach((f) => children.push(bullet(f)))
    children.push(blankPara())
  }

  if (data.debilidades && data.debilidades.length > 0) {
    children.push(heading2('Debilidades'))
    data.debilidades.forEach((d) => children.push(bullet(d)))
    children.push(blankPara())
  }

  if (data.recomendacion_anexos) {
    children.push(heading2('Recomendación de anexos'), bodyText(data.recomendacion_anexos), blankPara())
  }

  if (data.observaciones_texto) {
    children.push(heading2('Observaciones formales'), bodyText(data.observaciones_texto), blankPara())
  }

  if (data.oportunidades_observacion && data.oportunidades_observacion.length > 0) {
    children.push(heading2('Oportunidades de observación'))
    data.oportunidades_observacion.forEach((o) =>
      children.push(bullet(`[${o.tipo}] ${o.descripcion}: ${o.argumento}`))
    )
    children.push(blankPara())
  }

  if (data.estrategia_texto) {
    children.push(heading2('Estrategia de observaciones'), bodyText(data.estrategia_texto), blankPara())
  }
}

// ---------------------------------------------------------------------------
// Renderizar analisisClaude legacy (keys planos)
// ---------------------------------------------------------------------------

function renderLegacy(children: Paragraph[], analisis: Record<string, unknown>): void {
  const otros: Array<[string, unknown]> = []
  for (const [key, value] of Object.entries(analisis)) {
    const label = ANALISIS_KEY_LABELS[key]
    if (!label) { otros.push([key, value]); continue }
    children.push(heading3(label), ...valueToLines(value), blankPara())
  }
  if (otros.length > 0) {
    children.push(heading3('Otros hallazgos'))
    for (const [key, value] of otros) {
      const displayValue = typeof value === 'string' ? value
        : typeof value === 'number' || typeof value === 'boolean' ? String(value)
        : JSON.stringify(value)
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${key}: `, bold: true }),
            new TextRun({ text: displayValue }),
          ],
          indent: { left: 360 },
        })
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Función principal
// ---------------------------------------------------------------------------

export async function generarResumenDocx(opts: ResumenDocxOptions): Promise<Buffer> {
  const {
    nombreLicitacion, secopId, tipoFase, version, fecha,
    resumenEjecutivo, analisisClaude, empresaId, empresaNombre,
  } = opts

  const tituloFase = TIPO_FASE_LABELS[tipoFase] ?? tipoFase
  const fechaStr   = formatFechaES(fecha)
  const fechaGen   = formatFechaES(new Date())

  const subtitulo = empresaNombre
    ? `${tituloFase}   ·   Empresa: ${empresaNombre}   ·   v${version}   ·   ${fechaStr}`
    : `Fase: ${tituloFase}   ·   Versión ${version}   ·   ${fechaStr}`

  const children: Paragraph[] = []

  // Encabezado
  children.push(
    new Paragraph({
      children: [new TextRun({ text: nombreLicitacion, bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        ...(secopId ? [new TextRun({ text: `SECOP II: ${secopId}   ·   ` })] : []),
        new TextRun({ text: subtitulo, italics: true }),
      ],
    }),
    blankPara(),
  )

  // Cuerpo según modo
  if (empresaId && analisisClaude) {
    const typed = analisisClaude as LicitacionAnalisis
    const datoEmpresa = typed.por_empresa?.[empresaId]
    if (!datoEmpresa) {
      children.push(bodyText(`Sin análisis disponible para empresa id: ${empresaId}.`))
    } else {
      renderPorEmpresa(children, datoEmpresa)
    }
  } else if (analisisClaude && ('general' in analisisClaude || 'por_empresa' in analisisClaude)) {
    const typed = analisisClaude as LicitacionAnalisis
    if (resumenEjecutivo) {
      children.push(heading2('Resumen ejecutivo'), bodyText(resumenEjecutivo), blankPara())
    }
    renderGeneral(children, typed.general)
  } else {
    children.push(
      heading2('Resumen ejecutivo'),
      bodyText(resumenEjecutivo ?? 'Sin resumen ejecutivo disponible.'),
      blankPara(),
    )
    if (analisisClaude && typeof analisisClaude === 'object') {
      children.push(heading2('Detalle del análisis'))
      renderLegacy(children, analisisClaude)
    }
  }

  // Footer
  children.push(
    blankPara(),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generado por ConnexFL — ${fechaGen}`,
          italics: true,
          color: '888888',
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  )

  const doc = new Document({ sections: [{ children: children as Paragraph[] }] })
  return Packer.toBuffer(doc)
}
