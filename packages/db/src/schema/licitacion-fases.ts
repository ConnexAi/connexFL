import { pgTable, uuid, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { licitaciones } from './licitaciones'

export const licitacionFases = pgTable('licitacion_fases', {
  id:               uuid('id').primaryKey().defaultRandom(),
  licitacionId:     uuid('licitacion_id').references(() => licitaciones.id, { onDelete: 'cascade' }).notNull(),
  tipoFase:         text('tipo_fase').notNull(),
  version:          integer('version').default(1).notNull(),
  fecha:            timestamp('fecha'),
  documentosPath:   text('documentos_path').array(),
  textoExtraido:    text('texto_extraido'),
  analisisClaude:   jsonb('analisis_claude'),
  resumenEjecutivo: text('resumen_ejecutivo'),
  estado:           text('estado').default('pendiente').notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow(),
})

export type LicitacionFase = typeof licitacionFases.$inferSelect
export type NuevaLicitacionFase = typeof licitacionFases.$inferInsert

// Estructura esperada de analisis_claude según tipo de fase
// (convencion de aplicacion — la columna sigue siendo jsonb)
export interface LicitacionAnalisis {
  general?: {
    resumen_ejecutivo?: string
    requisitos_habilitantes?: {
      juridico?: string[]
      financiero?: string[]
      tecnico?: string[]
      experiencia?: string[]
    }
    criterios_ponderacion?: { criterio: string; peso: number }[]
    fechas_clave?: { fecha: string; evento: string }[]
    cascaritas?: { descripcion: string; ubicacion: string }[]
    empresas_candidatas?: { empresa_id: string; nombre_empresa: string; afinidad_resumen: string }[]
    // evaluacion_observaciones: campo adicional
    resumen_general?: string
    ranking_competidores?: {
      nombre_proponente: string
      puntaje_habilitante: 'habilitado' | 'no_habilitado'
      puntaje_ponderacion: number
      observaciones_detectadas: string
    }[]
  }
  por_empresa?: {
    [empresaId: string]: {
      // prepliego / pliego_definitivo
      veredicto_general?: 'cabe' | 'no_cabe' | 'cabe_con_observaciones'
      veredicto_final?: 'va' | 'no_va' | 'va_con_riesgos'
      resumen_ejecutivo?: string
      requisitos?: {
        categoria: 'juridico' | 'financiero' | 'tecnico' | 'experiencia'
        requisito: string
        estado: 'cumple' | 'no_cumple' | 'dudoso'
        justificacion: string
      }[]
      observaciones_texto?: string
      // pliego_definitivo extra
      fortalezas?: string[]
      debilidades?: string[]
      recomendacion_anexos?: string
      // evaluacion_observaciones
      puntaje_ponderacion?: number
      ranking?: number
      oportunidades_observacion?: {
        tipo: 'puntaje_propio_subvalorado' | 'puntaje_competidor_cuestionable'
        descripcion: string
        argumento: string
      }[]
      estrategia_texto?: string
    }
  }
}
