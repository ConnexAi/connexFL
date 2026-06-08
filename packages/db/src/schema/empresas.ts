import { pgTable, uuid, text, jsonb, timestamp, vector } from 'drizzle-orm/pg-core'
import { abogados } from './abogados'

export const empresas = pgTable('empresas', {
  id:                uuid('id').primaryKey().defaultRandom(),
  abogadoId:         uuid('abogado_id').references(() => abogados.id, { onDelete: 'cascade' }).notNull(),
  nombre:            text('nombre').notNull(),
  nit:               text('nit').notNull(),
  sector:            text('sector'),
  contextoRaw:       text('contexto_raw'),
  contextoProcesado: jsonb('contexto_procesado'),
  embedding:         vector('embedding', { dimensions: 1536 }),
  archivosPath:      text('archivos_path').array(),
  estado:            text('estado').default('pendiente').notNull(),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
})

export type Empresa = typeof empresas.$inferSelect
export type NuevaEmpresa = typeof empresas.$inferInsert
