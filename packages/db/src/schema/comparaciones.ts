import { pgTable, uuid, real, jsonb, text, timestamp } from 'drizzle-orm/pg-core'
import { empresas } from './empresas'
import { pliegos } from './pliegos'

export const comparaciones = pgTable('comparaciones', {
  id:        uuid('id').primaryKey().defaultRandom(),
  pliegoId:  uuid('pliego_id').references(() => pliegos.id, { onDelete: 'cascade' }).notNull(),
  empresaId: uuid('empresa_id').references(() => empresas.id, { onDelete: 'cascade' }).notNull(),
  score:     real('score'),
  resultado: jsonb('resultado'),
  anexos:    jsonb('anexos').array(),
  driveUrl:  text('drive_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type Comparacion = typeof comparaciones.$inferSelect
export type NuevaComparacion = typeof comparaciones.$inferInsert
