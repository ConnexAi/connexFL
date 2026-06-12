import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { abogados } from './abogados'

export const licitaciones = pgTable('licitaciones', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  abogadoId:          uuid('abogado_id').references(() => abogados.id, { onDelete: 'cascade' }).notNull(),
  secopId:            text('secop_id'),
  entidadContratante: text('entidad_contratante'),
  nombre:             text('nombre').notNull(),
  estado:             text('estado').default('activa').notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow(),
})

export type Licitacion = typeof licitaciones.$inferSelect
export type NuevaLicitacion = typeof licitaciones.$inferInsert
