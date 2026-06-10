import { Hono } from 'hono'
import { Pool } from 'pg'
import { authMiddleware } from '../middleware/auth'
import type { AppVariables } from '../types'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const comparacionesRouter = new Hono<{ Variables: AppVariables }>()

comparacionesRouter.get('/', async (c) => {
  const user = c.get('user')
  const pliegoId = c.req.query('pliegoId')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const query = pliegoId
      ? `SELECT c.*, e.nombre as empresa_nombre, e.nit, e.sector
         FROM comparaciones c
         JOIN empresas e ON c.empresa_id = e.id
         JOIN pliegos p ON c.pliego_id = p.id
         WHERE c.pliego_id = $1 AND p.abogado_id = $2
         ORDER BY c.score DESC NULLS LAST`
      : `SELECT c.*, e.nombre as empresa_nombre, e.nit
         FROM comparaciones c
         JOIN empresas e ON c.empresa_id = e.id
         JOIN pliegos p ON c.pliego_id = p.id
         WHERE p.abogado_id = $1
         ORDER BY c.created_at DESC`

    const params = pliegoId ? [pliegoId, abogado.rows[0].id] : [abogado.rows[0].id]
    const result = await pool.query(query, params)
    return c.json(result.rows)
  } catch (error) {
    console.error('Error obteniendo comparaciones:', error)
    return c.json({ error: 'Error al obtener comparaciones' }, 500)
  }
})

export default comparacionesRouter
