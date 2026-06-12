import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { abogados } from './abogados'

export const pliegos = pgTable('pliegos', {
  id:            uuid('id').primaryKey().defaultRandom(),
  abogadoId:     uuid('abogado_id').references(() => abogados.id, { onDelete: 'cascade' }).notNull(),
  nombre:        text('nombre').notNull(),
  secopId:       text('secop_id'),
  textoExtraido: text('texto_extraido'),
  resumen:       jsonb('resumen'),
  analisis:      jsonb('analisis'),
  archivosPath:  text('archivos_path').array(),
  estado:        text('estado').default('pendiente').notNull(),
  licitacionId:  uuid('licitacion_id'),
  faseId:        uuid('fase_id'),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow(),
})

export type Pliego = typeof pliegos.$inferSelect
export type NuevoPliego = typeof pliegos.$inferInsert
