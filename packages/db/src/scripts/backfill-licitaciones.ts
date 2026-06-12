/**
 * Backfill script — ejecutar una sola vez.
 * Por cada pliego existente sin licitacion_id:
 *   1. Crea una fila en `licitaciones`
 *   2. Crea una fila en `licitacion_fases` (tipo='pliego_definitivo', v1)
 *   3. Actualiza pliegos.licitacion_id y pliegos.fase_id
 *
 * Uso: npx tsx packages/db/src/scripts/backfill-licitaciones.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'
import { Pool } from 'pg'
import crypto from 'crypto'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function newId(): string {
  return crypto.randomUUID()
}

interface PliegoRow {
  id: string
  abogado_id: string
  nombre: string
  secop_id: string | null
  texto_extraido: string | null
  archivos_path: string[] | null
  analisis: Record<string, unknown> | null
  estado: string
  created_at: Date
}

async function backfill() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: pliegos } = await client.query<PliegoRow>(
      `SELECT id, abogado_id, nombre, secop_id, texto_extraido, archivos_path, analisis, estado, created_at
       FROM pliegos WHERE licitacion_id IS NULL ORDER BY created_at`
    )

    console.log(`Backfilling ${pliegos.length} pliegos...`)

    for (const pliego of pliegos) {
      const licitacionId = newId()
      const faseId = newId()

      // Intentar extraer entidad_contratante del análisis si existe
      let entidadContratante: string | null = null
      if (pliego.analisis && typeof pliego.analisis === 'object') {
        const a = pliego.analisis as Record<string, unknown>
        entidadContratante =
          (a['entidad_contratante'] as string | undefined) ??
          (a['entidad'] as string | undefined) ??
          null
      }

      await client.query(
        `INSERT INTO licitaciones (id, abogado_id, secop_id, entidad_contratante, nombre, estado, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'activa', $6, $6)`,
        [licitacionId, pliego.abogado_id, pliego.secop_id, entidadContratante, pliego.nombre, pliego.created_at]
      )

      await client.query(
        `INSERT INTO licitacion_fases
           (id, licitacion_id, tipo_fase, version, documentos_path, texto_extraido, analisis_claude, estado, created_at, updated_at)
         VALUES ($1, $2, 'pliego_definitivo', 1, $3, $4, $5, $6, $7, $7)`,
        [
          faseId,
          licitacionId,
          pliego.archivos_path ?? null,
          pliego.texto_extraido,
          pliego.analisis ?? null,
          pliego.estado === 'analizando' ? 'procesando' : pliego.estado,
          pliego.created_at,
        ]
      )

      await client.query(
        `UPDATE pliegos SET licitacion_id = $1, fase_id = $2 WHERE id = $3`,
        [licitacionId, faseId, pliego.id]
      )

      console.log(`  ✓ "${pliego.nombre}" → licitacion ${licitacionId}`)
    }

    await client.query('COMMIT')
    console.log(`\nBackfill completado. ${pliegos.length} pliegos migrados.`)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error en backfill — rollback aplicado:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

backfill()
