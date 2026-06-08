import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { auth } from './lib/auth'

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

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

serve({
  fetch: app.fetch,
  port: 8000,
}, (info) => {
  console.log(`API corriendo en http://localhost:${info.port}`)
})

export default app
