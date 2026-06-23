/**
 * Backfill idempotente: crea el registro en `pliegos` para licitaciones que
 * ya tienen fase prepliego pero no tienen pliego asociado.
 *
 * Caso específico: licitación "show tecnológico"
 *   licitacion_id : 8ddeab23-b781-43e5-88a2-47d6ee93f4de
 *   fase_id       : f7da90ed-de6b-49a2-b223-4cddfe732393
 *
 * Seguro correrlo varias veces (NOT EXISTS guard).
 *
 * Uso: npx tsx packages/db/src/scripts/backfill-pliego-prepliego.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const LICITACION_ID = '8ddeab23-b781-43e5-88a2-47d6ee93f4de'
const FASE_ID       = 'f7da90ed-de6b-49a2-b223-4cddfe732393'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const client = await pool.connect()
  try {
    // 1. Insertar pliego si no existe aún para esta licitación
    const insertRes = await client.query(
      `INSERT INTO pliegos
         (id, abogado_id, nombre, secop_id, estado, licitacion_id, fase_id, archivos_path, created_at)
       SELECT
         gen_random_uuid(),
         l.abogado_id,
         l.nombre,
         l.secop_id,
         'pendiente',
         l.id,
         lf.id,
         lf.documentos_path,
         NOW()
       FROM licitaciones l
       JOIN licitacion_fases lf ON lf.licitacion_id = l.id
       WHERE l.id  = $1
         AND lf.id = $2
         AND NOT EXISTS (
           SELECT 1 FROM pliegos p
           WHERE p.licitacion_id = $1
         )`,
      [LICITACION_ID, FASE_ID]
    )

    if (insertRes.rowCount && insertRes.rowCount > 0) {
      console.log(`Pliego creado para licitacion ${LICITACION_ID}`)
    } else {
      console.log(`Pliego ya existía para licitacion ${LICITACION_ID} — nada que insertar`)
    }

    // 2. Asegurar que fase_id y estado queden correctos
    const updateRes = await client.query(
      `UPDATE pliegos
       SET fase_id    = $2,
           estado     = 'listo',
           updated_at = NOW()
       WHERE licitacion_id = $1`,
      [LICITACION_ID, FASE_ID]
    )

    console.log(`Pliego actualizado: fase_id=${FASE_ID}, estado=listo (${updateRes.rowCount} fila/s)`)

    // 3. Verificación final
    const check = await client.query(
      `SELECT id, estado, fase_id FROM pliegos WHERE licitacion_id = $1`,
      [LICITACION_ID]
    )
    console.log('Estado final:', check.rows)
  } catch (error) {
    console.error('Error en backfill:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
