import { Hono } from 'hono'
import { Pool } from 'pg'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { UPLOAD_DIR } from '../middleware/upload'
import type { AppVariables } from '../types'
import { prepareDocumentsForClaude } from '../services/pdf-extractor'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const empresasRouter = new Hono<{ Variables: AppVariables }>()

// GET /api/empresas — listar empresas del abogado
empresasRouter.get('/', async (c) => {
  const user = c.get('user')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )

    if (abogado.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }

    const empresas = await pool.query(
      'SELECT id, nombre, nit, sector, estado, created_at FROM empresas WHERE abogado_id = $1 ORDER BY created_at DESC',
      [abogado.rows[0].id]
    )

    return c.json(empresas.rows)
  } catch (error) {
    console.error('Error listando empresas:', error)
    return c.json({ error: 'Error al listar empresas' }, 500)
  }
})

// POST /api/empresas — crear empresa con archivos
empresasRouter.post('/', async (c) => {
  const user = c.get('user')

  try {
    // Obtener abogado
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )

    if (abogado.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }

    const abogadoId = abogado.rows[0].id

    // Parsear form data
    const formData = await c.req.formData()
    const nombre = formData.get('nombre') as string
    const nit = formData.get('nit') as string
    const sector = formData.get('sector') as string
    const contextoTexto = formData.get('contexto_texto') as string
    const archivos = formData.getAll('archivos') as File[]

    if (!nombre || !nit) {
      return c.json({ error: 'nombre y nit son requeridos' }, 400)
    }

    // Guardar archivos en disco
    const empresaId = uuidv4()
    const empresaDir = join(UPLOAD_DIR, 'empresas', empresaId)
    mkdirSync(empresaDir, { recursive: true })

    const archivosPath: string[] = []

    for (const archivo of archivos) {
      if (archivo instanceof File) {
        const buffer = Buffer.from(await archivo.arrayBuffer())
        const filename = `${Date.now()}_${archivo.name}`
        const filepath = join(empresaDir, filename)
        writeFileSync(filepath, buffer)
        archivosPath.push(filepath)
      }
    }

    // Preparar documentos PDF en base64 para Claude
    const documentos = await prepareDocumentsForClaude(archivosPath)

    // Contexto: texto manual + lista de documentos subidos
    const contextoRaw = JSON.stringify({
      descripcion: contextoTexto ?? '',
      documentos: documentos.map(d => ({ nombre: d.nombre })),
    })

    // Guardar empresa en PostgreSQL
    const empresa = await pool.query(
      `INSERT INTO empresas (id, abogado_id, nombre, nit, sector, contexto_raw, archivos_path, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente')
       RETURNING id, nombre, nit, sector, estado, created_at`,
      [empresaId, abogadoId, nombre, nit, sector, contextoRaw, archivosPath]
    )

    // Disparar webhook a n8n de forma async (no bloquea la respuesta)
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/empresa-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({
          empresaId,
          abogadoId,
          archivosPath,
          contextoRaw,
          documentosBase64: documentos,
        }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json(empresa.rows[0], 201)
  } catch (error) {
    console.error('Error creando empresa:', error)
    return c.json({ error: 'Error al crear empresa' }, 500)
  }
})

// POST /api/empresas/:id/archivos — agregar archivos a empresa existente
empresasRouter.post('/:id/archivos', async (c) => {
  const user = c.get('user')
  const empresaId = c.req.param('id')

  try {
    const result = await pool.query(
      `SELECT e.id, e.archivos_path, a.id as abogado_id FROM empresas e
       INNER JOIN abogados a ON e.abogado_id = a.id
       WHERE e.id = $1 AND a.email = $2`,
      [empresaId, user.email]
    )

    if (result.rows.length === 0) {
      return c.json({ error: 'Empresa no encontrada' }, 404)
    }

    const abogadoId = result.rows[0].abogado_id
    const existingPaths: string[] = result.rows[0].archivos_path ?? []

    const formData = await c.req.formData()
    const archivos = formData.getAll('archivos') as File[]

    if (archivos.length === 0) {
      return c.json({ error: 'Al menos un archivo es requerido' }, 400)
    }

    const empresaDir = join(UPLOAD_DIR, 'empresas', empresaId)
    mkdirSync(empresaDir, { recursive: true })

    const newPaths: string[] = []

    for (const archivo of archivos) {
      if (archivo instanceof File) {
        const buffer = Buffer.from(await archivo.arrayBuffer())
        const filename = `${Date.now()}_${archivo.name}`
        const filepath = join(empresaDir, filename)
        writeFileSync(filepath, buffer)
        newPaths.push(filepath)
      }
    }

    const allPaths = [...existingPaths, ...newPaths]
    const documentos = await prepareDocumentsForClaude(allPaths)
    const contextoRaw = JSON.stringify({
      descripcion: '',
      documentos: documentos.map(d => ({ nombre: d.nombre })),
    })

    await pool.query(
      `UPDATE empresas SET archivos_path = $1, contexto_raw = $2, estado = 'pendiente' WHERE id = $3`,
      [allPaths, contextoRaw, empresaId]
    )

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/empresa-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({
          empresaId,
          abogadoId,
          archivosPath: allPaths,
          contextoRaw,
          documentosBase64: documentos,
        }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json({ ok: true, archivos_path: allPaths })
  } catch (error) {
    console.error('Error agregando archivos a empresa:', error)
    return c.json({ error: 'Error al agregar archivos' }, 500)
  }
})

// GET /api/empresas/:id/analisis-docx — descargar análisis como Word
empresasRouter.get('/:id/analisis-docx', async (c) => {
  const user = c.get('user')
  const empresaId = c.req.param('id')

  try {
    const result = await pool.query(
      `SELECT e.nombre, e.nit, e.sector, e.contexto_procesado, e.estado
       FROM empresas e
       INNER JOIN abogados a ON e.abogado_id = a.id
       WHERE e.id = $1 AND a.email = $2`,
      [empresaId, user.email]
    )

    if (result.rows.length === 0) {
      return c.json({ error: 'Empresa no encontrada' }, 404)
    }

    const empresa = result.rows[0]
    const analisis = empresa.contexto_procesado

    if (!analisis) {
      return c.json({ error: 'La empresa aún no tiene análisis generado' }, 400)
    }

    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

    const children: Paragraph[] = [
      new Paragraph({
        text: `Análisis de empresa: ${empresa.nombre}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `NIT: ${empresa.nit}`, bold: true })],
        spacing: { after: 100 },
      }),
      empresa.sector
        ? new Paragraph({ text: `Sector: ${empresa.sector}`, spacing: { after: 300 } })
        : new Paragraph({ text: '' }),
      new Paragraph({ text: 'Resumen ejecutivo', heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
      new Paragraph({ text: analisis.resumen_ejecutivo ?? '', spacing: { after: 300 } }),
    ]

    if (analisis.fortalezas?.length) {
      children.push(new Paragraph({ text: 'Fortalezas', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }))
      for (const item of analisis.fortalezas) {
        children.push(new Paragraph({ text: `• ${item}`, spacing: { after: 80 } }))
      }
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    }

    if (analisis.debilidades?.length) {
      children.push(new Paragraph({ text: 'Debilidades', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }))
      for (const item of analisis.debilidades) {
        children.push(new Paragraph({ text: `• ${item}`, spacing: { after: 80 } }))
      }
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    }

    children.push(
      new Paragraph({ text: 'Indicadores', heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
      new Paragraph({
        children: [
          new TextRun({ text: `Años de experiencia: `, bold: true }),
          new TextRun({ text: String(analisis.anos_experiencia ?? '—') }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Habilitación legal: `, bold: true }),
          new TextRun({ text: analisis.habilitacion_legal ?? '—' }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Nivel financiero: `, bold: true }),
          new TextRun({ text: analisis.indicadores_financieros?.nivel ?? '—' }),
        ],
        spacing: { after: 300 },
      }),
    )

    if (analisis.tipos_contrato_recomendados?.length) {
      children.push(new Paragraph({ text: 'Tipos de contrato recomendados', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }))
      children.push(new Paragraph({ text: analisis.tipos_contrato_recomendados.join(', '), spacing: { after: 300 } }))
    }

    if (analisis.contratos_ejecutados?.length) {
      children.push(new Paragraph({ text: 'Contratos ejecutados', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }))
      const tableRows = [
        new TableRow({
          children: ['Descripción', 'Entidad', 'Valor', 'Año'].map((h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              borders: cellBorders,
              width: { size: 25, type: WidthType.PERCENTAGE },
            })
          ),
        }),
        ...analisis.contratos_ejecutados.map((c: { descripcion: string; entidad: string; valor_aproximado: string; ano: string }) =>
          new TableRow({
            children: [c.descripcion, c.entidad, c.valor_aproximado, String(c.ano)].map((val) =>
              new TableCell({
                children: [new Paragraph({ text: val ?? '' })],
                borders: cellBorders,
                width: { size: 25, type: WidthType.PERCENTAGE },
              })
            ),
          })
        ),
      ]
      children.push(
        new Paragraph({ text: '' }),
      )
    }

    if (analisis.capacidad_tecnica) {
      children.push(
        new Paragraph({ text: 'Capacidad técnica', heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
        new Paragraph({ text: analisis.capacidad_tecnica, spacing: { after: 300 } }),
      )
    }

    const doc = new Document({ sections: [{ children }] })
    const buffer = await Packer.toBuffer(doc)
    const filename = `analisis-${empresa.nombre.replace(/\s+/g, '-').toLowerCase()}.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generando docx empresa:', error)
    return c.json({ error: 'Error al generar el documento' }, 500)
  }
})

// GET /api/empresas/:id — obtener empresa por id
empresasRouter.get('/:id', async (c) => {
  const user = c.get('user')
  const empresaId = c.req.param('id')

  try {
    const result = await pool.query(
      `SELECT e.* FROM empresas e
       INNER JOIN abogados a ON e.abogado_id = a.id
       WHERE e.id = $1 AND a.email = $2`,
      [empresaId, user.email]
    )

    if (result.rows.length === 0) {
      return c.json({ error: 'Empresa no encontrada' }, 404)
    }

    return c.json(result.rows[0])
  } catch (error) {
    return c.json({ error: 'Error al obtener empresa' }, 500)
  }
})

export default empresasRouter
