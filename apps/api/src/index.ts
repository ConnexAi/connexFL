import path from 'path'
import { config } from 'dotenv'

config({ path: path.resolve(__dirname, '../../../.env') })

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'
import { authMiddleware } from './middleware/auth'
import abogadosRouter from './routes/abogados'
import empresasRouter from './routes/empresas'
import pliegosRouter from './routes/pliegos'
import comparacionesRouter from './routes/comparaciones'
import anexosRouter from './routes/anexos'

const app = new Hono()

app.use('*', cors({
  origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.on(['GET', 'POST'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
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

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

serve({
  fetch: app.fetch,
  port: 8000,
}, (info) => {
  console.log(`API corriendo en http://localhost:${info.port}`)
})

export default app
