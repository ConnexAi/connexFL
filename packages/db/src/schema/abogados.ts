import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const abogados = pgTable('abogados', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').notNull().unique(),
  nombre:       text('nombre').notNull(),
  plan:         text('plan').default('free'),
  tokensUsados: integer('tokens_usados').default(0).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export type Abogado = typeof abogados.$inferSelect
export type NuevoAbogado = typeof abogados.$inferInsert
