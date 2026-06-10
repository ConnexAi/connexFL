import { Hono } from 'hono'
import { Pool } from 'pg'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { UPLOAD_DIR } from '../middleware/upload'
import type { AppVariables } from '../types'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const anexosRouter = new Hono<{ Variables: AppVariables }>()

// POST /api/anexos/generar — recibe plantillas y dispara n8n
anexosRouter.post('/generar', async (c) => {
  const user = c.get('user')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)
    const abogadoId = abogado.rows[0].id

    const formData = await c.req.formData()
    const pliegoId = formData.get('pliego_id') as string
    const empresaId = formData.get('empresa_id') as string
    const plantillas = formData.getAll('plantillas') as File[]

    if (!pliegoId || !empresaId) {
      return c.json({ error: 'pliego_id y empresa_id son requeridos' }, 400)
    }

    const pliegoResult = await pool.query(
      'SELECT * FROM pliegos WHERE id = $1 AND abogado_id = $2',
      [pliegoId, abogadoId]
    )
    if (pliegoResult.rows.length === 0) return c.json({ error: 'Pliego no encontrado' }, 404)

    const empresaResult = await pool.query(
      'SELECT * FROM empresas WHERE id = $1 AND abogado_id = $2',
      [empresaId, abogadoId]
    )
    if (empresaResult.rows.length === 0) return c.json({ error: 'Empresa no encontrada' }, 404)

    // Guardar plantillas en disco
    const anexoId = uuidv4()
    const anexoDir = join(UPLOAD_DIR, 'anexos', anexoId)
    mkdirSync(anexoDir, { recursive: true })

    const plantillasPath: string[] = []
    for (const plantilla of plantillas) {
      if (plantilla instanceof File) {
        const buffer = Buffer.from(await plantilla.arrayBuffer())
        const filename = `${Date.now()}_${plantilla.name}`
        const filepath = join(anexoDir, filename)
        writeFileSync(filepath, buffer)
        plantillasPath.push(filepath)
      }
    }

    // Convertir plantillas a base64 (PDFs, DOCX, XLSX)
    const plantillasBase64 = plantillasPath.map((p) => {
      const lower = p.toLowerCase()
      let mediaType = 'application/octet-stream'
      if (lower.endsWith('.pdf')) mediaType = 'application/pdf'
      else if (lower.endsWith('.docx')) mediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      else if (lower.endsWith('.xlsx')) mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      return {
        nombre: p.split('/').pop() ?? 'plantilla',
        base64: readFileSync(p).toString('base64'),
        mediaType,
      }
    })

    // Marcar estado como procesando en comparaciones
    await pool.query(
      `UPDATE comparaciones SET estado_anexos = 'procesando' WHERE pliego_id = $1 AND empresa_id = $2`,
      [pliegoId, empresaId]
    )

    // Disparar webhook a n8n de forma async
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/generar-anexos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({
          anexoId,
          pliegoId,
          empresaId,
          abogadoId,
          plantillasBase64,
          pliego: pliegoResult.rows[0],
          empresa: empresaResult.rows[0],
        }),
      }).catch((err) => console.error('Error webhook anexos:', err))
    }

    return c.json({
      anexoId,
      mensaje: 'Generando anexos. Estarán listos en unos momentos.',
      estado: 'procesando',
    }, 201)
  } catch (error) {
    console.error('Error generando anexos:', error)
    return c.json({ error: 'Error al generar anexos' }, 500)
  }
})

// GET /api/anexos/:pliegoId/:empresaId — obtener estado y anexos generados
anexosRouter.get('/:pliegoId/:empresaId', async (c) => {
  const user = c.get('user')
  const pliegoId = c.req.param('pliegoId')
  const empresaId = c.req.param('empresaId')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const result = await pool.query(
      `SELECT c.anexos, c.estado_anexos, c.anexos_generados FROM comparaciones c
       JOIN pliegos p ON c.pliego_id = p.id
       WHERE c.pliego_id = $1 AND c.empresa_id = $2 AND p.abogado_id = $3`,
      [pliegoId, empresaId, abogado.rows[0].id]
    )

    if (result.rows.length === 0) return c.json({ error: 'No encontrado' }, 404)
    return c.json(result.rows[0])
  } catch (error) {
    console.error('Error obteniendo anexos:', error)
    return c.json({ error: 'Error al obtener anexos' }, 500)
  }
})

export default anexosRouter
