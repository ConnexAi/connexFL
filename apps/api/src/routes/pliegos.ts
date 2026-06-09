import { Hono } from 'hono'
import { Pool } from 'pg'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { UPLOAD_DIR } from '../middleware/upload'
import type { AppVariables } from '../types'

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

    const pliego = await pool.query(
      `INSERT INTO pliegos (id, abogado_id, nombre, secop_id, archivos_path, estado)
       VALUES ($1, $2, $3, $4, $5, 'pendiente')
       RETURNING id, nombre, secop_id, estado, archivos_path, created_at`,
      [pliegoId, abogadoId, nombre, secopId || null, archivosPath]
    )

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/pliego-analisis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({ pliegoId, abogadoId, archivosPath }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json(pliego.rows[0], 201)
  } catch (error) {
    console.error('Error creando pliego:', error)
    return c.json({ error: 'Error al crear pliego' }, 500)
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

    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/pliego-analisis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({ pliegoId, abogadoId, archivosPath: allPaths }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json({ ok: true, archivos_path: allPaths })
  } catch (error) {
    console.error('Error agregando archivos a pliego:', error)
    return c.json({ error: 'Error al agregar archivos' }, 500)
  }
})

export default pliegosRouter
