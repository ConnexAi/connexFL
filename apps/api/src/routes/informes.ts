import { Hono } from 'hono'
import { Pool } from 'pg'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, type FileChild } from 'docx'
import type { AppVariables } from '../types'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const informesRouter = new Hono<{ Variables: AppVariables }>()

// ---------------------------------------------------------------------------
// GET /api/informes/empresas
// Returns per-empresa stats: total evaluadas, este mes, mes anterior, últimas 5
// ---------------------------------------------------------------------------
informesRouter.get('/empresas', async (c) => {
  const user = c.get('user')

  try {
    const abogadoRes = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogadoRes.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }
    const abogadoId = abogadoRes.rows[0].id as string

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const result = await pool.query(
      `SELECT
         e.id,
         e.nombre,
         e.sector,
         e.nit,
         COUNT(c.id)::int AS total_evaluadas,
         COUNT(c.id) FILTER (WHERE c.created_at >= $2)::int AS este_mes,
         COUNT(c.id) FILTER (WHERE c.created_at >= $3 AND c.created_at < $4)::int AS mes_anterior,
         AVG(c.score) AS score_promedio,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'comparacion_id', c.id,
             'pliego_id', p.id,
             'licitacion_id', p.licitacion_id,
             'nombre_licitacion', p.nombre,
             'score', c.score,
             'created_at', c.created_at
           ) ORDER BY c.created_at DESC
         ) FILTER (WHERE c.id IS NOT NULL) AS ultimas_evaluaciones
       FROM empresas e
       LEFT JOIN comparaciones c ON c.empresa_id = e.id
       LEFT JOIN pliegos p ON p.id = c.pliego_id
       WHERE e.abogado_id = $1
       GROUP BY e.id, e.nombre, e.sector, e.nit
       ORDER BY e.nombre`,
      [abogadoId, thisMonthStart, prevMonthStart, prevMonthEnd]
    )

    const empresas = result.rows.map((row) => ({
      id: row.id as string,
      nombre: row.nombre as string,
      sector: row.sector as string | null,
      nit: row.nit as string | null,
      total_evaluadas: row.total_evaluadas as number,
      este_mes: row.este_mes as number,
      mes_anterior: row.mes_anterior as number,
      score_promedio: row.score_promedio ? Math.round(Number(row.score_promedio)) : null,
      ultimas_evaluaciones: ((row.ultimas_evaluaciones ?? []) as Array<{
        comparacion_id: string
        pliego_id: string
        licitacion_id: string | null
        nombre_licitacion: string
        score: number | null
        created_at: string
      }>).slice(0, 5),
    }))

    return c.json(empresas)
  } catch (error) {
    console.error('Error obteniendo informes:', error)
    return c.json({ error: 'Error al obtener informes' }, 500)
  }
})

// ---------------------------------------------------------------------------
// GET /api/informes/empresas/:empresaId/docx?mes=2026-06
// Genera informe Word para una empresa en un mes específico
// ---------------------------------------------------------------------------
informesRouter.get('/empresas/:empresaId/docx', async (c) => {
  const user = c.get('user')
  const empresaId = c.req.param('empresaId')
  const mes = c.req.query('mes') // formato: YYYY-MM

  try {
    const abogadoRes = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogadoRes.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }
    const abogadoId = abogadoRes.rows[0].id as string

    // Verificar que la empresa pertenece al abogado
    const empresaRes = await pool.query(
      'SELECT id, nombre, nit, sector FROM empresas WHERE id = $1 AND abogado_id = $2',
      [empresaId, abogadoId]
    )
    if (empresaRes.rows.length === 0) {
      return c.json({ error: 'Empresa no encontrada' }, 404)
    }
    const empresa = empresaRes.rows[0] as { id: string; nombre: string; nit: string | null; sector: string | null }

    // Filtro de mes
    let dateFilter = ''
    let params: string[] = [empresaId]
    if (mes) {
      const parts = mes.split('-')
      const year = parseInt(parts[0] ?? '2024', 10)
      const month = parseInt(parts[1] ?? '1', 10)
      const start = new Date(year, month - 1, 1).toISOString()
      const end = new Date(year, month, 1).toISOString()
      params = [empresaId, start, end]
      dateFilter = 'AND c.created_at >= $2 AND c.created_at < $3'
    }

    const compRes = await pool.query(
      `SELECT c.id, c.score, c.justificacion, c.fortalezas_relevantes, c.riesgos, c.created_at,
              p.nombre AS nombre_pliego, p.entidad, p.secop_id
       FROM comparaciones c
       JOIN pliegos p ON p.id = c.pliego_id
       WHERE c.empresa_id = $1 ${dateFilter}
       ORDER BY c.created_at DESC`,
      params
    )
    const comparaciones = compRes.rows as Array<{
      id: string
      score: number | null
      justificacion: string | null
      fortalezas_relevantes: string[] | null
      riesgos: string[] | null
      created_at: string
      nombre_pliego: string
      entidad: string | null
      secop_id: string | null
    }>

    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

    const mesLabel = mes
      ? new Date(`${mes}-01`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
      : 'Todos los períodos'

    const children: FileChild[] = [
      new Paragraph({
        text: `Informe de evaluaciones: ${empresa.nombre}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Período: ${mesLabel}`, bold: true })],
        spacing: { after: 100 },
      }),
    ]

    if (empresa.nit) {
      children.push(new Paragraph({ text: `NIT: ${empresa.nit}`, spacing: { after: 60 } }))
    }
    if (empresa.sector) {
      children.push(new Paragraph({ text: `Sector: ${empresa.sector}`, spacing: { after: 200 } }))
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: `Total evaluaciones: ${comparaciones.length}`, bold: true })],
      spacing: { after: 100 },
    }))

    if (comparaciones.length > 0) {
      const scorePromedio = comparaciones
        .filter((c) => c.score !== null)
        .reduce((sum, c) => sum + (c.score ?? 0), 0) / comparaciones.filter((c) => c.score !== null).length

      if (!isNaN(scorePromedio)) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Score promedio: ${Math.round(scorePromedio)}`, bold: true })],
          spacing: { after: 300 },
        }))
      }
    }

    if (comparaciones.length === 0) {
      children.push(new Paragraph({ text: 'No hay evaluaciones para este período.', spacing: { after: 200 } }))
    } else {
      children.push(new Paragraph({
        text: 'Detalle de evaluaciones',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }))

      // Resumen en tabla
      children.push(new Table({
        rows: [
          new TableRow({
            children: ['Licitación', 'Entidad', 'Score', 'Fecha'].map((h) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                borders: cellBorders,
                width: { size: 25, type: WidthType.PERCENTAGE },
              })
            ),
          }),
          ...comparaciones.map((c) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: c.nombre_pliego })], borders: cellBorders, width: { size: 35, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: c.entidad ?? '—' })], borders: cellBorders, width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: c.score !== null ? String(c.score) : '—' })], borders: cellBorders, width: { size: 10, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ text: new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) })], borders: cellBorders, width: { size: 25, type: WidthType.PERCENTAGE } }),
              ],
            })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }))

      // Detalle por licitación
      for (const comp of comparaciones) {
        children.push(new Paragraph({ text: '', spacing: { after: 300 } }))
        children.push(new Paragraph({
          children: [new TextRun({ text: comp.nombre_pliego, bold: true })],
          spacing: { after: 80 },
        }))
        if (comp.entidad) {
          children.push(new Paragraph({ text: `Entidad: ${comp.entidad}`, spacing: { after: 60 } }))
        }
        if (comp.justificacion) {
          children.push(new Paragraph({ text: `Análisis: ${comp.justificacion}`, spacing: { after: 100 } }))
        }
        if (comp.fortalezas_relevantes?.length) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'Fortalezas relevantes:', bold: true })], spacing: { after: 60 } }))
          for (const f of comp.fortalezas_relevantes) {
            children.push(new Paragraph({ text: `• ${f}`, spacing: { after: 40 } }))
          }
        }
        if (comp.riesgos?.length) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'Riesgos:', bold: true })], spacing: { after: 60 } }))
          for (const r of comp.riesgos) {
            children.push(new Paragraph({ text: `• ${r}`, spacing: { after: 40 } }))
          }
        }
      }
    }

    const doc = new Document({ sections: [{ children }] })
    const buffer = await Packer.toBuffer(doc)

    const filename = `informe-${empresa.nombre.toLowerCase().replace(/\s+/g, '-')}-${mes ?? 'completo'}.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generando informe docx:', error)
    return c.json({ error: 'Error al generar informe' }, 500)
  }
})
