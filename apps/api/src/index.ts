import path from 'path'
import { config } from 'dotenv'

config({ path: path.resolve(__dirname, '../../../.env') })

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
console.log('Better Auth inicializado:', typeof auth.handler)
import { authMiddleware } from './middleware/auth'
import abogadosRouter from './routes/abogados'
import empresasRouter from './routes/empresas'
import pliegosRouter from './routes/pliegos'
import comparacionesRouter from './routes/comparaciones'
import anexosRouter from './routes/anexos'
import licitacionesRouter, { licitacionesN8nRouter } from './routes/licitaciones'
import { informesRouter } from './routes/informes'

const app = new Hono()

app.use('*', cors({
  origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.get('/api/auth/test', (c) => c.json({
  status: 'auth routes mounted',
  baseURL: process.env.BETTER_AUTH_URL,
  googleId: process.env.GOOGLE_CLIENT_ID?.slice(0, 20),
}))

app.all('/api/auth/*', async (c) => {
  if (process.env.DEBUG_AUTH === 'true') {
    console.debug('Auth handler called:', c.req.method, c.req.url)
  }
  try {
    const response = await auth.handler(c.req.raw)
    if (process.env.DEBUG_AUTH === 'true') {
      console.debug('Auth handler response status:', response.status)
    }
    return response
  } catch (error) {
    console.error('Better Auth error:', error)
    return c.json({ error: 'Auth error', details: String(error) }, 500)
  }
})

app.route('/api/abogados', abogadosRouter)

app.use('/api/empresas/*', authMiddleware)
app.route('/api/empresas', empresasRouter)

app.use('/api/pliegos/*', authMiddleware)
app.route('/api/pliegos', pliegosRouter)

app.use('/api/comparaciones/*', authMiddleware)
app.route('/api/comparaciones', comparacionesRouter)

app.use('/api/anexos/*', authMiddleware)
app.route('/api/anexos', anexosRouter)

// n8n internal callbacks — must be BEFORE authMiddleware (no session cookie)
app.route('/api/licitaciones', licitacionesN8nRouter)

app.use('/api/licitaciones/*', authMiddleware)
app.route('/api/licitaciones', licitacionesRouter)

app.use('/api/informes/*', authMiddleware)
app.route('/api/informes', informesRouter)

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

serve({
  fetch: app.fetch,
  port: 8000,
}, (info) => {
  console.log(`API corriendo en http://localhost:${info.port}`)
})

export default app
