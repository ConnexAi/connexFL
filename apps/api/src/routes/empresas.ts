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

    // Combinar contexto: texto manual + nombres de archivos subidos
    const contextoRaw = [
      contextoTexto ?? '',
      archivosPath.length > 0 ? `\nArchivos subidos: ${archivosPath.map(p => p.split(/[/\\]/).pop()).join(', ')}` : ''
    ].join('\n').trim()

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

    await pool.query(
      `UPDATE empresas SET archivos_path = $1, estado = 'pendiente' WHERE id = $2`,
      [allPaths, empresaId]
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
        body: JSON.stringify({ empresaId, abogadoId, archivosPath: allPaths }),
      }).catch(err => console.error('Error disparando webhook n8n:', err))
    }

    return c.json({ ok: true, archivos_path: allPaths })
  } catch (error) {
    console.error('Error agregando archivos a empresa:', error)
    return c.json({ error: 'Error al agregar archivos' }, 500)
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
