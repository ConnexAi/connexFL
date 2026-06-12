import { Hono } from 'hono'
import { Pool } from 'pg'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { UPLOAD_DIR } from '../middleware/upload'
import type { AppVariables } from '../types'
import { prepareDocumentsForClaude } from '../services/pdf-extractor'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, TableRow, TableCell, WidthType, Table } from 'docx'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const pliegosRouter = new Hono<{ Variables: AppVariables }>()

// GET /api/pliegos — listar pliegos del abogado
pliegosRouter.get('/', async (c) => {
  const user = c.get('user')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )

    if (abogado.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }

    const pliegos = await pool.query(
      `SELECT id, nombre, secop_id, estado, archivos_path, created_at
       FROM pliegos WHERE abogado_id = $1 ORDER BY created_at DESC`,
      [abogado.rows[0].id]
    )

    return c.json(pliegos.rows)
  } catch (error) {
    console.error('Error listando pliegos:', error)
    return c.json({ error: 'Error al listar pliegos' }, 500)
  }
})

// POST /api/pliegos — crear pliego con archivos
pliegosRouter.post('/', async (c) => {
  const user = c.get('user')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )

    if (abogado.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }

    const abogadoId = abogado.rows[0].id

    const formData = await c.req.formData()
    const nombre = formData.get('nombre') as string
    const secopId = formData.get('secop_id') as string | null
    const archivos = formData.getAll('archivos') as File[]

    if (!nombre) {
      return c.json({ error: 'nombre es requerido' }, 400)
    }

    if (archivos.length === 0) {
      return c.json({ error: 'Al menos un archivo es requerido' }, 400)
    }

    const pliegoId = uuidv4()
    const pliegoDir = join(UPLOAD_DIR, 'pliegos', pliegoId)
    mkdirSync(pliegoDir, { recursive: true })

    const archivosPath: string[] = []

    for (const archivo of archivos) {
      if (archivo instanceof File) {
        const buffer = Buffer.from(await archivo.arrayBuffer())
        const filename = `${Date.now()}_${archivo.name}`
        const filepath = join(pliegoDir, filename)
        writeFileSync(filepath, buffer)
        archivosPath.push(filepath)
      }
    }

    // Crear licitacion y fase asociada al pliego
    const licitacionId = uuidv4()
    const faseId = uuidv4()

    await pool.query(
      `INSERT INTO licitaciones (id, abogado_id, nombre, secop_id, estado)
       VALUES ($1, $2, $3, $4, 'activa')`,
      [licitacionId, abogadoId, nombre, secopId || null]
    )

    await pool.query(
      `INSERT INTO licitacion_fases (id, licitacion_id, tipo_fase, version, documentos_path, estado)
       VALUES ($1, $2, 'pliego_definitivo', 1, $3, 'pendiente')`,
      [faseId, licitacionId, archivosPath]
    )

    const pliego = await pool.query(
      `INSERT INTO pliegos (id, abogado_id, nombre, secop_id, archivos_path, estado, licitacion_id, fase_id)
       VALUES ($1, $2, $3, $4, $5, 'pendiente', $6, $7)
       RETURNING id, nombre, secop_id, estado, archivos_path, licitacion_id, fase_id, created_at`,
      [pliegoId, abogadoId, nombre, secopId || null, archivosPath, licitacionId, faseId]
    )

    const documentos = prepareDocumentsForClaude(archivosPath)

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/pliego-analisis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({ pliegoId, abogadoId, archivosPath, documentosBase64: documentos }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json(pliego.rows[0], 201)
  } catch (error) {
    console.error('Error creando pliego:', error)
    return c.json({ error: 'Error al crear pliego' }, 500)
  }
})

// GET /api/pliegos/:id/analisis-docx — descargar análisis como Word
pliegosRouter.get('/:id/analisis-docx', async (c) => {
  const user = c.get('user')
  const pliegoId = c.req.param('id')

  try {
    const result = await pool.query(
      `SELECT p.nombre, p.secop_id, p.entidad, p.analisis, p.estado
       FROM pliegos p
       INNER JOIN abogados a ON p.abogado_id = a.id
       WHERE p.id = $1 AND a.email = $2`,
      [pliegoId, user.email]
    )

    if (result.rows.length === 0) {
      return c.json({ error: 'Pliego no encontrado' }, 404)
    }

    const pliego = result.rows[0]
    const analisis = pliego.analisis

    if (!analisis) {
      return c.json({ error: 'El pliego aún no tiene análisis generado' }, 400)
    }

    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }

    const children: Paragraph[] = [
      new Paragraph({
        text: `Análisis de pliego: ${pliego.nombre}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
    ]

    if (pliego.entidad) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `Entidad: ${pliego.entidad}`, bold: true })],
        spacing: { after: 100 },
      }))
    }
    if (pliego.secop_id) {
      children.push(new Paragraph({ text: `ID SECOP II: ${pliego.secop_id}`, spacing: { after: 300 } }))
    }

    if (analisis.resumen) {
      children.push(
        new Paragraph({ text: 'Resumen', heading: HeadingLevel.HEADING_2, spacing: { after: 120 } }),
        new Paragraph({ text: analisis.resumen, spacing: { after: 300 } }),
      )
    }

    if (analisis.requisitos_habilitantes?.length) {
      children.push(new Paragraph({ text: 'Requisitos habilitantes', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }))
      for (const item of analisis.requisitos_habilitantes) {
        children.push(new Paragraph({ text: `• ${item}`, spacing: { after: 80 } }))
      }
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    }

    if (analisis.criterios_ponderacion?.length) {
      children.push(new Paragraph({ text: 'Criterios de ponderación', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }))
      const tableRows = [
        new TableRow({
          children: ['Criterio', 'Peso (%)'].map((h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
              borders: cellBorders,
              width: { size: 50, type: WidthType.PERCENTAGE },
            })
          ),
        }),
        ...analisis.criterios_ponderacion.map((c: { criterio: string; peso: number }) =>
          new TableRow({
            children: [c.criterio, `${c.peso}%`].map((val) =>
              new TableCell({
                children: [new Paragraph({ text: val })],
                borders: cellBorders,
                width: { size: 50, type: WidthType.PERCENTAGE },
              })
            ),
          })
        ),
      ]
      children.push(new Paragraph({ children: [] }))
    }

    if (analisis.fechas_clave?.length) {
      children.push(new Paragraph({ text: 'Fechas clave', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }))
      for (const item of analisis.fechas_clave) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${item.evento}: `, bold: true }),
            new TextRun({ text: item.fecha }),
          ],
          spacing: { after: 80 },
        }))
      }
      children.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    }

    if (analisis.inconsistencias?.length) {
      children.push(new Paragraph({ text: 'Inconsistencias detectadas', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }))
      for (const item of analisis.inconsistencias) {
        children.push(new Paragraph({ text: `⚠ ${item}`, spacing: { after: 80 } }))
      }
    }

    const doc = new Document({ sections: [{ children }] })
    const buffer = await Packer.toBuffer(doc)
    const filename = `analisis-pliego-${pliego.nombre.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generando docx pliego:', error)
    return c.json({ error: 'Error al generar el documento' }, 500)
  }
})

// GET /api/pliegos/:id — obtener pliego por id
pliegosRouter.get('/:id', async (c) => {
  const user = c.get('user')
  const pliegoId = c.req.param('id')

  try {
    const result = await pool.query(
      `SELECT p.* FROM pliegos p
       INNER JOIN abogados a ON p.abogado_id = a.id
       WHERE p.id = $1 AND a.email = $2`,
      [pliegoId, user.email]
    )

    if (result.rows.length === 0) {
      return c.json({ error: 'Pliego no encontrado' }, 404)
    }

    return c.json(result.rows[0])
  } catch (error) {
    return c.json({ error: 'Error al obtener pliego' }, 500)
  }
})

// POST /api/pliegos/:id/archivos — agregar archivos a pliego existente
pliegosRouter.post('/:id/archivos', async (c) => {
  const user = c.get('user')
  const pliegoId = c.req.param('id')

  try {
    const result = await pool.query(
      `SELECT p.id, p.archivos_path, a.id as abogado_id FROM pliegos p
       INNER JOIN abogados a ON p.abogado_id = a.id
       WHERE p.id = $1 AND a.email = $2`,
      [pliegoId, user.email]
    )

    if (result.rows.length === 0) {
      return c.json({ error: 'Pliego no encontrado' }, 404)
    }

    const abogadoId = result.rows[0].abogado_id
    const existingPaths: string[] = result.rows[0].archivos_path ?? []

    const formData = await c.req.formData()
    const archivos = formData.getAll('archivos') as File[]

    if (archivos.length === 0) {
      return c.json({ error: 'Al menos un archivo es requerido' }, 400)
    }

    const pliegoDir = join(UPLOAD_DIR, 'pliegos', pliegoId)
    mkdirSync(pliegoDir, { recursive: true })

    const newPaths: string[] = []

    for (const archivo of archivos) {
      if (archivo instanceof File) {
        const buffer = Buffer.from(await archivo.arrayBuffer())
        const filename = `${Date.now()}_${archivo.name}`
        const filepath = join(pliegoDir, filename)
        writeFileSync(filepath, buffer)
        newPaths.push(filepath)
      }
    }

    const allPaths = [...existingPaths, ...newPaths]

    await pool.query(
      `UPDATE pliegos SET archivos_path = $1, estado = 'pendiente' WHERE id = $2`,
      [allPaths, pliegoId]
    )

    const documentos = prepareDocumentsForClaude(allPaths)

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/pliego-analisis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({ pliegoId, abogadoId, archivosPath: allPaths, documentosBase64: documentos }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json({ ok: true, archivos_path: allPaths })
  } catch (error) {
    console.error('Error agregando archivos a pliego:', error)
    return c.json({ error: 'Error al agregar archivos' }, 500)
  }
})

export default pliegosRouter
