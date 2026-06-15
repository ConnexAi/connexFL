import { Hono } from 'hono'
import { Pool } from 'pg'
import type { AppVariables } from '../types'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const comparacionesRouter = new Hono<{ Variables: AppVariables }>()

// ---------------------------------------------------------------------------
// GET /api/comparaciones — lista; filtros opcionales: pliegoId, licitacionId,
//   ronda ('prepliego'|'definitivo'), seleccionada ('true'|'false')
// ---------------------------------------------------------------------------
comparacionesRouter.get('/', async (c) => {
  const user = c.get('user')
  const pliegoId     = c.req.query('pliegoId')
  const licitacionId = c.req.query('licitacionId')
  const rondaQ       = c.req.query('ronda')
  const selQ         = c.req.query('seleccionada')

  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const params: unknown[] = [abogado.rows[0].id]
    const where: string[] = ['p.abogado_id = $1']

    if (pliegoId) {
      params.push(pliegoId)
      where.push(`c.pliego_id = $${params.length}`)
    }
    if (licitacionId) {
      params.push(licitacionId)
      where.push(`p.licitacion_id = $${params.length}`)
    }
    if (rondaQ) {
      params.push(rondaQ)
      where.push(`c.ronda = $${params.length}`)
    }
    if (selQ !== undefined) {
      params.push(selQ === 'true')
      where.push(`c.seleccionada = $${params.length}`)
    }

    const orderBy = pliegoId || licitacionId
      ? 'ORDER BY c.score DESC NULLS LAST'
      : 'ORDER BY c.created_at DESC'

    const query = `
      SELECT c.*, e.nombre AS empresa_nombre, e.nit, e.sector,
             p.licitacion_id AS pliego_licitacion_id
      FROM comparaciones c
      JOIN empresas e ON c.empresa_id = e.id
      JOIN pliegos p ON c.pliego_id = p.id
      WHERE ${where.join(' AND ')}
      ${orderBy}`

    const result = await pool.query(query, params)
    return c.json(result.rows)
  } catch (error) {
    console.error('Error obteniendo comparaciones:', error)
    return c.json({ error: 'Error al obtener comparaciones' }, 500)
  }
})

// ---------------------------------------------------------------------------
// PATCH /api/comparaciones/:id — actualizar seleccionada
// ---------------------------------------------------------------------------
comparacionesRouter.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const body = await c.req.json() as { seleccionada?: boolean }
    if (typeof body.seleccionada !== 'boolean') {
      return c.json({ error: 'seleccionada (boolean) es requerido' }, 400)
    }

    // Verificar ownership vía pliego → abogado
    const check = await pool.query(
      `SELECT c.id FROM comparaciones c
       JOIN pliegos p ON c.pliego_id = p.id
       WHERE c.id = $1 AND p.abogado_id = $2`,
      [id, abogado.rows[0].id]
    )
    if (check.rows.length === 0) return c.json({ error: 'Comparación no encontrada' }, 404)

    const result = await pool.query(
      'UPDATE comparaciones SET seleccionada=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [body.seleccionada, id]
    )
    return c.json(result.rows[0])
  } catch (error) {
    console.error('Error actualizando comparación:', error)
    return c.json({ error: 'Error al actualizar comparación' }, 500)
  }
})

export default comparacionesRouter
