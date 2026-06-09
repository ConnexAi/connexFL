import type { Context, Next } from 'hono'
import { auth } from '../lib/auth'
import type { AppVariables } from '../types'

export async function authMiddleware(c: Context<{ Variables: AppVariables }>, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  if (!session) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  c.set('session', session)
  c.set('user', session.user)
  return next()
}
