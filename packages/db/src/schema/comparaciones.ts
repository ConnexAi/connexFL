import { pgTable, uuid, real, jsonb, text, timestamp } from 'drizzle-orm/pg-core'
import { empresas } from './empresas'
import { pliegos } from './pliegos'

export const comparaciones = pgTable('comparaciones', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  pliegoId:             uuid('pliego_id').references(() => pliegos.id, { onDelete: 'cascade' }).notNull(),
  empresaId:            uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  score:                real('score'),
  resultado:            jsonb('resultado'),
  justificacion:        text('justificacion'),
  fortalezasRelevantes: jsonb('fortalezas_relevantes'),
  riesgos:              jsonb('riesgos'),
  anexos:               jsonb('anexos').array(),
  driveUrl:             text('drive_url'),
  estadoAnexos:         text('estado_anexos').default('pendiente'),
  anexosGenerados:      jsonb('anexos_generados'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow(),
})

export type Comparacion = typeof comparaciones.$inferSelect
export type NuevaComparacion = typeof comparaciones.$inferInsert
