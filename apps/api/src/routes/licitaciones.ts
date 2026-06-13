import { Hono } from 'hono'
import { Pool } from 'pg'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { UPLOAD_DIR } from '../middleware/upload'
import type { AppVariables } from '../types'
import { prepareDocumentsForClaude } from '../services/pdf-extractor'
import { generarResumenDocx } from '../services/resumen-docx'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const TIPO_FASE_SLUG: Record<string, string> = {
  prepliego:                'prepliego',
  pliego_definitivo:        'pliego-definitivo',
  anexos:                   'anexos',
  evaluacion_observaciones: 'eval-obs',
  // legacy
  estudio_previo:           'estudio-previo',
  borrador_pliego:          'borrador-pliego',
  respuesta_observaciones:  'respuesta-obs',
  audiencia_riesgos:        'audiencia-riesgos',
  presentacion_ofertas:     'pres-ofertas',
  adjudicacion:             'adjudicacion',
}

export const licitacionesRouter = new Hono<{ Variables: AppVariables }>()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWebhookHeaders(secret?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(secret ? { 'x-webhook-secret': secret } : {}),
  }
}

async function dispatchWebhook(path: string, body: unknown): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET
  if (!webhookUrl) return
  fetch(`${webhookUrl}/${path}`, {
    method: 'POST',
    headers: getWebhookHeaders(webhookSecret),
    body: JSON.stringify(body),
  }).catch((err) => console.error(`Error webhook ${path}:`, err))
}

// ---------------------------------------------------------------------------
// GET /api/licitaciones — lista del abogado con fase más avanzada
// ---------------------------------------------------------------------------
licitacionesRouter.get('/', async (c) => {
  const user = c.get('user')
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'Abogado no encontrado' }, 404)

    const result = await pool.query(
      `SELECT l.*,
        (SELECT lf.tipo_fase FROM licitacion_fases lf
         WHERE lf.licitacion_id = l.id AND lf.estado = 'listo'
         ORDER BY lf.created_at DESC LIMIT 1) AS ultima_fase_listo
       FROM licitaciones l
       WHERE l.abogado_id = $1
       ORDER BY l.created_at DESC`,
      [abogado.rows[0].id]
    )
    return c.json(result.rows)
  } catch (error) {
    console.error('Error listando licitaciones:', error)
    return c.json({ error: 'Error al listar licitaciones' }, 500)
  }
})

// ---------------------------------------------------------------------------
// GET /api/licitaciones/:id — detalle + fases
// ---------------------------------------------------------------------------
licitacionesRouter.get('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'Abogado no encontrado' }, 404)

    const lic = await pool.query(
      'SELECT * FROM licitaciones WHERE id = $1 AND abogado_id = $2',
      [id, abogado.rows[0].id]
    )
    if (lic.rows.length === 0) return c.json({ error: 'Licitación no encontrada' }, 404)

    const fases = await pool.query(
      'SELECT * FROM licitacion_fases WHERE licitacion_id = $1 ORDER BY tipo_fase, version',
      [id]
    )

    // Incluir pliego_id si existe (para Anexos node)
    const pliego = await pool.query(
      'SELECT id FROM pliegos WHERE licitacion_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    )

    return c.json({
      ...lic.rows[0],
      fases: fases.rows,
      pliego_id: pliego.rows[0]?.id ?? null,
    })
  } catch (error) {
    console.error('Error obteniendo licitación:', error)
    return c.json({ error: 'Error al obtener licitación' }, 500)
  }
})

// ---------------------------------------------------------------------------
// POST /api/licitaciones — crear licitación vacía
// ---------------------------------------------------------------------------
licitacionesRouter.post('/', async (c) => {
  const user = c.get('user')
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'Abogado no encontrado' }, 404)

    const body = await c.req.json() as {
      nombre?: string
      secopId?: string
      entidadContratante?: string
    }
    if (!body.nombre?.trim()) return c.json({ error: 'nombre es requerido' }, 400)

    const result = await pool.query(
      `INSERT INTO licitaciones (id, abogado_id, nombre, secop_id, entidad_contratante, estado)
       VALUES ($1, $2, $3, $4, $5, 'activa')
       RETURNING *`,
      [uuidv4(), abogado.rows[0].id, body.nombre.trim(), body.secopId ?? null, body.entidadContratante ?? null]
    )
    return c.json(result.rows[0], 201)
  } catch (error) {
    console.error('Error creando licitación:', error)
    return c.json({ error: 'Error al crear licitación' }, 500)
  }
})

// ---------------------------------------------------------------------------
// POST /api/licitaciones/:id/fases — agregar fase con documentos
// Dispatch diferenciado por tipoFase:
//   prepliego                → analisis-prepliego-general
//   pliego_definitivo        → pliego-analisis (+ crea pliego en pliegos)
//   evaluacion_observaciones → analisis-competidores
//   resto                    → fase-analisis (genérico)
// ---------------------------------------------------------------------------
licitacionesRouter.post('/:id/fases', async (c) => {
  const user = c.get('user')
  const licitacionId = c.req.param('id')
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const lic = await pool.query(
      'SELECT * FROM licitaciones WHERE id = $1 AND abogado_id = $2',
      [licitacionId, abogado.rows[0].id]
    )
    if (lic.rows.length === 0) return c.json({ error: 'Licitación no encontrada' }, 404)

    const formData = await c.req.formData()
    const tipoFase = formData.get('tipo_fase') as string | null
    const archivos = formData.getAll('archivos') as File[]

    if (!tipoFase) return c.json({ error: 'tipo_fase es requerido' }, 400)

    // Auto-incrementar versión
    const versionRes = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version
       FROM licitacion_fases WHERE licitacion_id = $1 AND tipo_fase = $2`,
      [licitacionId, tipoFase]
    )
    const version = versionRes.rows[0].next_version as number

    // Guardar archivos en disco
    const faseId = uuidv4()
    const documentosPath: string[] = []

    if (archivos.length > 0) {
      const faseDir = join(UPLOAD_DIR, 'fases', faseId)
      mkdirSync(faseDir, { recursive: true })
      for (const archivo of archivos) {
        if (archivo instanceof File) {
          const buffer = Buffer.from(await archivo.arrayBuffer())
          const filename = `${Date.now()}_${archivo.name}`
          const filepath = join(faseDir, filename)
          writeFileSync(filepath, buffer)
          documentosPath.push(filepath)
        }
      }
    }

    // Estado inicial: procesando si hay archivos y hay webhook definido, sino pendiente
    const estadoInicial = process.env.N8N_WEBHOOK_URL && documentosPath.length > 0 ? 'procesando' : 'pendiente'

    const fase = await pool.query(
      `INSERT INTO licitacion_fases (id, licitacion_id, tipo_fase, version, documentos_path, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [faseId, licitacionId, tipoFase, version, documentosPath.length > 0 ? documentosPath : null, estadoInicial]
    )

    const licitacion = lic.rows[0] as {
      id: string; nombre: string; secop_id: string | null; entidad_contratante: string | null
    }

    // --- Dispatch según tipoFase ---
    if (documentosPath.length > 0) {
      const documentos = prepareDocumentsForClaude(documentosPath)

      if (tipoFase === 'prepliego') {
        dispatchWebhook('analisis-prepliego-general', {
          faseId,
          licitacionId,
          version,
          abogadoId: abogado.rows[0].id,
          documentosBase64: documentos,
          licitacion,
        })
      } else if (tipoFase === 'pliego_definitivo') {
        // Crear pliego asociado para que Analizar Pliego pueda escribir comparaciones
        const pliegoId = uuidv4()
        await pool.query(
          `INSERT INTO pliegos (id, abogado_id, nombre, secop_id, archivos_path, estado, licitacion_id, fase_id)
           VALUES ($1, $2, $3, $4, $5, 'analizando', $6, $7)`,
          [
            pliegoId,
            abogado.rows[0].id,
            licitacion.nombre,
            licitacion.secop_id,
            documentosPath,
            licitacionId,
            faseId,
          ]
        )
        dispatchWebhook('pliego-analisis', {
          pliegoId,
          faseId,
          licitacionId,
          abogadoId: abogado.rows[0].id,
          documentosBase64: documentos,
        })
      } else if (tipoFase === 'evaluacion_observaciones') {
        dispatchWebhook('analisis-competidores', {
          faseId,
          licitacionId,
          abogadoId: abogado.rows[0].id,
          documentosBase64: documentos,
          licitacion,
        })
      }
      // tipoFase='anexos' y cualquier otro: no disparan webhook —
      // los anexos se generan a través de la página de anexos (POST /api/anexos/generar)
    }

    return c.json(fase.rows[0], 201)
  } catch (error) {
    console.error('Error creando fase:', error)
    return c.json({ error: 'Error al crear fase' }, 500)
  }
})

// ---------------------------------------------------------------------------
// POST /api/licitaciones/:id/fases/:faseId/analizar-empresas
// body: { empresaIds: string[] }
// ---------------------------------------------------------------------------
licitacionesRouter.post('/:id/fases/:faseId/analizar-empresas', async (c) => {
  const user = c.get('user')
  const { id: licitacionId, faseId } = c.req.param()
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    // Verificar ownership
    const faseRes = await pool.query(
      `SELECT lf.* FROM licitacion_fases lf
       JOIN licitaciones l ON lf.licitacion_id = l.id
       WHERE lf.id = $1 AND l.id = $2 AND l.abogado_id = $3`,
      [faseId, licitacionId, abogado.rows[0].id]
    )
    if (faseRes.rows.length === 0) return c.json({ error: 'Fase no encontrada' }, 404)

    const body = await c.req.json() as { empresaIds?: string[] }
    if (!Array.isArray(body.empresaIds) || body.empresaIds.length === 0) {
      return c.json({ error: 'empresaIds[] es requerido' }, 400)
    }

    const fase = faseRes.rows[0] as {
      id: string; tipo_fase: string; documentos_path: string[] | null
    }

    // Para pliego_definitivo: marcar comparaciones como seleccionada=true
    if (fase.tipo_fase === 'pliego_definitivo') {
      const pliego = await pool.query(
        'SELECT id FROM pliegos WHERE licitacion_id = $1 ORDER BY created_at DESC LIMIT 1',
        [licitacionId]
      )
      if (pliego.rows.length > 0) {
        for (const empresaId of body.empresaIds) {
          await pool.query(
            `UPDATE comparaciones SET seleccionada=true, updated_at=NOW()
             WHERE pliego_id=$1 AND empresa_id=$2`,
            [pliego.rows[0].id, empresaId]
          )
        }
      }
    }

    // Marcar fase como procesando
    await pool.query(
      "UPDATE licitacion_fases SET estado='procesando', updated_at=NOW() WHERE id=$1",
      [faseId]
    )

    // Dispatch según tipoFase
    const webhookPath = fase.tipo_fase === 'pliego_definitivo'
      ? 'analisis-pliego-definitivo-empresa'
      : 'analisis-prepliego-empresa'

    const documentos = fase.documentos_path ? prepareDocumentsForClaude(fase.documentos_path) : []

    dispatchWebhook(webhookPath, {
      faseId,
      licitacionId,
      abogadoId: abogado.rows[0].id,
      empresaIds: body.empresaIds,
      documentosBase64: documentos,
    })

    return c.json({ ok: true, procesando: body.empresaIds.length })
  } catch (error) {
    console.error('Error en analizar-empresas:', error)
    return c.json({ error: 'Error al iniciar análisis' }, 500)
  }
})

// ---------------------------------------------------------------------------
// GET /api/licitaciones/:id/fases/:faseId — detalle de una fase
// ---------------------------------------------------------------------------
licitacionesRouter.get('/:id/fases/:faseId', async (c) => {
  const user = c.get('user')
  const { id, faseId } = c.req.param()
  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const result = await pool.query(
      `SELECT lf.* FROM licitacion_fases lf
       JOIN licitaciones l ON lf.licitacion_id = l.id
       WHERE lf.id = $1 AND l.id = $2 AND l.abogado_id = $3`,
      [faseId, id, abogado.rows[0].id]
    )
    if (result.rows.length === 0) return c.json({ error: 'Fase no encontrada' }, 404)
    return c.json(result.rows[0])
  } catch (error) {
    return c.json({ error: 'Error al obtener fase' }, 500)
  }
})

// ---------------------------------------------------------------------------
// GET /api/licitaciones/:id/fases/:faseId/resumen-docx
// query: ?empresaId=<uuid> (opcional)
// ---------------------------------------------------------------------------
licitacionesRouter.get('/:id/fases/:faseId/resumen-docx', async (c) => {
  const user = c.get('user')
  const { id, faseId } = c.req.param()
  const empresaId = c.req.query('empresaId')

  try {
    const abogado = await pool.query('SELECT id FROM abogados WHERE email = $1', [user.email])
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const result = await pool.query(
      `SELECT lf.*, l.nombre AS licitacion_nombre, l.secop_id
       FROM licitacion_fases lf
       JOIN licitaciones l ON lf.licitacion_id = l.id
       WHERE lf.id = $1 AND l.id = $2 AND l.abogado_id = $3`,
      [faseId, id, abogado.rows[0].id]
    )
    if (result.rows.length === 0) return c.json({ error: 'Fase no encontrada' }, 404)

    const fase = result.rows[0] as {
      licitacion_nombre: string
      secop_id: string | null
      tipo_fase: string
      version: number
      fecha: Date | null
      resumen_ejecutivo: string | null
      analisis_claude: Record<string, unknown> | null
    }

    // Si se pide un empresaId, verificar que exista en analisis_claude.por_empresa
    let empresaNombre: string | undefined
    if (empresaId) {
      const typed = fase.analisis_claude as { por_empresa?: Record<string, unknown> } | null
      if (!typed?.por_empresa?.[empresaId]) {
        return c.json({ error: 'Análisis de empresa no disponible' }, 404)
      }
      // Obtener nombre de la empresa para el nombre del archivo
      const empRes = await pool.query('SELECT nombre FROM empresas WHERE id=$1', [empresaId])
      empresaNombre = empRes.rows[0]?.nombre as string | undefined
    }

    const buffer = await generarResumenDocx({
      nombreLicitacion: fase.licitacion_nombre,
      secopId: fase.secop_id,
      tipoFase: fase.tipo_fase,
      version: fase.version,
      fecha: fase.fecha,
      resumenEjecutivo: fase.resumen_ejecutivo,
      analisisClaude: fase.analisis_claude,
      ...(empresaId
        ? {
            empresaId,
            ...(empresaNombre !== undefined ? { empresaNombre } : {}),
          }
        : {}),
    })

    const faseSlug = TIPO_FASE_SLUG[fase.tipo_fase] ?? fase.tipo_fase
    const nombreSafe = fase.licitacion_nombre.replace(/[^a-z0-9]/gi, '-').slice(0, 40)
    const empresaSafe = empresaNombre?.replace(/[^a-z0-9]/gi, '-').slice(0, 30) ?? ''

    const filename = empresaId
      ? `analisis-${faseSlug}-${empresaSafe}-${nombreSafe}.docx`
      : `resumen-${faseSlug}-v${fase.version}-${nombreSafe}.docx`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generando resumen-docx:', error)
    return c.json({ error: 'Error al generar el documento' }, 500)
  }
})

export default licitacionesRouter
