import { Hono } from 'hono'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const abogadosRouter = new Hono()

abogadosRouter.post('/sync', async (c) => {
  const body = await c.req.json()
  const { id, email, nombre } = body

  if (!id || !email) {
    return c.json({ error: 'id y email son requeridos' }, 400)
  }

  try {
    // abogados.id es uuid generado por postgres; usamos email como clave de upsert
    const result = await pool.query(
      `INSERT INTO abogados (email, nombre)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE
       SET nombre = EXCLUDED.nombre
       RETURNING *`,
      [email, nombre ?? email.split('@')[0]]
    )
    return c.json(result.rows[0], 201)
  } catch (error) {
    console.error('Error sync abogado:', error)
    return c.json({ error: 'Error al sincronizar abogado' }, 500)
  }
})

abogadosRouter.get('/me', async (c) => {
  const email = c.req.header('x-user-email')

  if (!email) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  try {
    const result = await pool.query(
      'SELECT * FROM abogados WHERE email = $1',
      [email]
    )
    if (result.rows.length === 0) {
      return c.json({ error: 'Abogado no encontrado' }, 404)
    }
    return c.json(result.rows[0])
  } catch (error) {
    return c.json({ error: 'Error al obtener abogado' }, 500)
  }
})

export default abogadosRouter
