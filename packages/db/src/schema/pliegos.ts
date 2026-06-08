import { pgTable, uuid, text, jsonb, timestamp, vector } from 'drizzle-orm/pg-core'
import { abogados } from './abogados'

export const pliegos = pgTable('pliegos', {
  id:            uuid('id').primaryKey().defaultRandom(),
  abogadoId:     uuid('abogado_id').references(() => abogados.id, { onDelete: 'cascade' }).notNull(),
  nombre:        text('nombre').notNull(),
  secopId:       text('secop_id'),
  textoExtraido: text('texto_extraido'),
  resumen:       jsonb('resumen'),
  embedding:     vector('embedding', { dimensions: 1536 }),
  archivosPath:  text('archivos_path').array(),
  estado:        text('estado').default('pendiente').notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
})

export type Pliego = typeof pliegos.$inferSelect
export type NuevoPliego = typeof pliegos.$inferInsert
