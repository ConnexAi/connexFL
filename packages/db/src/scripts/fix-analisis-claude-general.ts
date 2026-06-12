/**
 * Fix idempotente: para fases 'pliego_definitivo' cuyo analisis_claude tiene
 * datos planos del Sprint 3 (sin wrapper 'general'), lo envuelve en { general: {...} }
 * mapeando las claves del formato antiguo al nuevo.
 *
 * Solo toca filas donde analisis_claude IS NOT NULL pero analisis_claude->'general' IS NULL.
 * Es seguro correrlo varias veces.
 *
 * Uso: npx tsx packages/db/src/scripts/fix-analisis-claude-general.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

interface FlatAnalisis {
  resumen?: string
  resumen_ejecutivo?: string
  fechas_clave?: unknown[]
  inconsistencias?: unknown[]
  cascaritas?: unknown[]
  criterios_ponderacion?: unknown[]
  requisitos_habilitantes?: unknown
  [key: string]: unknown
}

interface Cascarita {
  descripcion: string
  ubicacion: string
}

function buildGeneral(flat: FlatAnalisis): Record<string, unknown> {
  const general: Record<string, unknown> = {}

  // Texto ejecutivo: preferir resumen_ejecutivo si ya existe, sino usar resumen
  const resumenTexto = flat.resumen_ejecutivo ?? flat.resumen
  if (resumenTexto) general['resumen_ejecutivo'] = resumenTexto

  if (flat.fechas_clave) general['fechas_clave'] = flat.fechas_clave
  if (flat.criterios_ponderacion) general['criterios_ponderacion'] = flat.criterios_ponderacion
  if (flat.requisitos_habilitantes) general['requisitos_habilitantes'] = flat.requisitos_habilitantes
  if (flat.empresas_candidatas) general['empresas_candidatas'] = flat['empresas_candidatas']

  // Cascaritas: si ya vienen en formato nuevo lo respeta; si son strings del formato antiguo, convierte
  const rawCascaritas = flat.cascaritas ?? flat.inconsistencias
  if (rawCascaritas && Array.isArray(rawCascaritas)) {
    if (rawCascaritas.length > 0 && typeof rawCascaritas[0] === 'string') {
      general['cascaritas'] = (rawCascaritas as string[]).map((s): Cascarita => ({
        descripcion: s,
        ubicacion: '',
      }))
    } else {
      general['cascaritas'] = rawCascaritas
    }
  }

  return general
}

async function fixAnalisisClaude() {
  const client = await pool.connect()
  try {
    // Fases con datos planos del Sprint 3 (analisis_claude existe pero sin clave 'general')
    const { rows } = await client.query<{
      fase_id: string
      analisis_claude: FlatAnalisis
      pliego_estado: string | null
    }>(`
      SELECT lf.id AS fase_id, lf.analisis_claude, p.estado AS pliego_estado
      FROM licitacion_fases lf
      LEFT JOIN pliegos p ON p.fase_id = lf.id
      WHERE lf.analisis_claude IS NOT NULL
        AND (lf.analisis_claude -> 'general') IS NULL
        AND lf.tipo_fase IN ('prepliego', 'pliego_definitivo')
    `)

    console.log(`Fases a corregir: ${rows.length}`)

    for (const row of rows) {
      const general = buildGeneral(row.analisis_claude)
      const nuevoAnalisis = { general }

      // Si el pliego original estaba 'listo', la fase también debería quedar 'listo'
      const nuevoEstado = row.pliego_estado === 'listo' ? 'listo' : undefined

      const setClause = nuevoEstado
        ? `analisis_claude = $1, estado = $2`
        : `analisis_claude = $1`
      const params = nuevoEstado
        ? [JSON.stringify(nuevoAnalisis), nuevoEstado, row.fase_id]
        : [JSON.stringify(nuevoAnalisis), row.fase_id]
      const idxId = nuevoEstado ? 3 : 2

      await client.query(
        `UPDATE licitacion_fases SET ${setClause}, updated_at = NOW() WHERE id = $${idxId}`,
        params
      )

      console.log(`  ✓ fase ${row.fase_id} — analisis_claude actualizado${nuevoEstado ? ` (estado: ${nuevoEstado})` : ''}`)
    }

    console.log(`\nFix completado. ${rows.length} fases actualizadas.`)
  } catch (error) {
    console.error('Error en fix:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

fixAnalisisClaude()
