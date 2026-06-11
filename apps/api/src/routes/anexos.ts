import { Hono } from 'hono'
import { Pool } from 'pg'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import AdmZip from 'adm-zip'
import { UPLOAD_DIR } from '../middleware/upload'
import type { AppVariables } from '../types'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function applyReplacementsToXml(
  docXml: string,
  reemplazos: Array<{ campo_original: string; valor_nuevo: string; encontrado: boolean }>
): string {
  // PASO 1: reemplazo directo en el XML (campos no fragmentados entre runs)
  let resultado = docXml

  for (const r of reemplazos) {
    if (!r.encontrado || !r.campo_original || !r.valor_nuevo) continue
    const valorEscapado = r.valor_nuevo
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const campoRegex = new RegExp(
      r.campo_original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'gi'
    )
    resultado = resultado.replace(campoRegex, valorEscapado)
  }

  // PASO 2: campos fragmentados — operar párrafo por párrafo concatenando texto visible
  const parrafoRegex = /<w:p[ >][\s\S]*?<\/w:p>/g

  resultado = resultado.replace(parrafoRegex, (parrafo) => {
    const textoCombinado = parrafo.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, '$1')

    let textoModificado = textoCombinado
    let huboCambio = false

    for (const r of reemplazos) {
      if (!r.encontrado || !r.campo_original || !r.valor_nuevo) continue

      const valorEscapado = r.valor_nuevo
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')

      if (textoModificado.includes(r.campo_original)) {
        textoModificado = textoModificado.split(r.campo_original).join(valorEscapado)
        huboCambio = true
        continue
      }

      // Fuzzy: buscar el campo sin corchetes por si Word omitió los delimitadores
      const campoSinCorchetes = r.campo_original.replace(/[\[\]]/g, '').trim()
      if (campoSinCorchetes.length > 3 && textoModificado.includes(campoSinCorchetes)) {
        textoModificado = textoModificado.split(campoSinCorchetes).join(valorEscapado)
        huboCambio = true
        continue
      }

      // Case-insensitive: cubre variantes de capitalización
      const campoLower = r.campo_original.toLowerCase()
      let idx = textoModificado.toLowerCase().indexOf(campoLower)
      while (idx !== -1) {
        textoModificado = textoModificado.substring(0, idx) +
          valorEscapado +
          textoModificado.substring(idx + r.campo_original.length)
        idx = textoModificado.toLowerCase().indexOf(campoLower)
        huboCambio = true
      }
    }

    if (!huboCambio) return parrafo

    const pPrMatch = parrafo.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)
    const pPr = pPrMatch ? pPrMatch[0] : ''
    const rPrMatch = parrafo.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)
    const rPr = rPrMatch ? rPrMatch[0] : ''
    const nsP = parrafo.match(/<w:p([^>]*)>/)
    const pAttrs = nsP ? nsP[1] : ''

    return `<w:p${pAttrs}>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${textoModificado}</w:t></w:r></w:p>`
  })

  return resultado
}

export const anexosRouter = new Hono<{ Variables: AppVariables }>()

// POST /api/anexos/generar — recibe plantillas y dispara n8n
anexosRouter.post('/generar', async (c) => {
  const user = c.get('user')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)
    const abogadoId = abogado.rows[0].id

    const formData = await c.req.formData()
    const pliegoId = formData.get('pliego_id') as string
    const empresaId = formData.get('empresa_id') as string
    const plantillas = formData.getAll('plantillas') as File[]

    if (!pliegoId || !empresaId) {
      return c.json({ error: 'pliego_id y empresa_id son requeridos' }, 400)
    }

    const pliegoResult = await pool.query(
      'SELECT * FROM pliegos WHERE id = $1 AND abogado_id = $2',
      [pliegoId, abogadoId]
    )
    if (pliegoResult.rows.length === 0) return c.json({ error: 'Pliego no encontrado' }, 404)

    const empresaResult = await pool.query(
      'SELECT * FROM empresas WHERE id = $1 AND abogado_id = $2',
      [empresaId, abogadoId]
    )
    if (empresaResult.rows.length === 0) return c.json({ error: 'Empresa no encontrada' }, 404)

    // Guardar plantillas en disco
    const anexoId = uuidv4()
    const anexoDir = join(UPLOAD_DIR, 'anexos', anexoId)
    mkdirSync(anexoDir, { recursive: true })

    const plantillasPath: string[] = []
    for (const plantilla of plantillas) {
      if (plantilla instanceof File) {
        const buffer = Buffer.from(await plantilla.arrayBuffer())
        const filename = `${Date.now()}_${plantilla.name}`
        const filepath = join(anexoDir, filename)
        writeFileSync(filepath, buffer)
        plantillasPath.push(filepath)
      }
    }

    // Convertir plantillas a base64 (PDFs, DOCX, XLSX)
    const plantillasBase64 = plantillasPath.map((p) => {
      const lower = p.toLowerCase()
      let mediaType = 'application/octet-stream'
      if (lower.endsWith('.pdf')) mediaType = 'application/pdf'
      else if (lower.endsWith('.docx')) mediaType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      else if (lower.endsWith('.xlsx')) mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      return {
        nombre: p.split('/').pop() ?? 'plantilla',
        base64: readFileSync(p).toString('base64'),
        mediaType,
      }
    })

    // Marcar estado como procesando en comparaciones
    await pool.query(
      `UPDATE comparaciones SET estado_anexos = 'procesando' WHERE pliego_id = $1 AND empresa_id = $2`,
      [pliegoId, empresaId]
    )

    // Disparar webhook a n8n de forma async
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET

    if (webhookUrl) {
      fetch(`${webhookUrl}/generar-anexos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookSecret ? { 'x-webhook-secret': webhookSecret } : {}),
        },
        body: JSON.stringify({
          anexoId,
          pliegoId,
          empresaId,
          abogadoId,
          plantillasBase64,
          pliego: pliegoResult.rows[0],
          empresa: empresaResult.rows[0],
        }),
      }).catch((err) => console.error('Error webhook anexos:', err))
    }

    return c.json({
      anexoId,
      mensaje: 'Generando anexos. Estarán listos en unos momentos.',
      estado: 'procesando',
    }, 201)
  } catch (error) {
    console.error('Error generando anexos:', error)
    return c.json({ error: 'Error al generar anexos' }, 500)
  }
})

// GET /api/anexos/descargar/:pliegoId/:empresaId/:index — descargar .docx editado
anexosRouter.get('/descargar/:pliegoId/:empresaId/:index', async (c) => {
  const user = c.get('user')
  const { pliegoId, empresaId, index } = c.req.param()

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const result = await pool.query(
      `SELECT c.anexos_generados FROM comparaciones c
       JOIN pliegos p ON c.pliego_id = p.id
       WHERE c.pliego_id = $1 AND c.empresa_id = $2 AND p.abogado_id = $3`,
      [pliegoId, empresaId, abogado.rows[0].id]
    )

    if (result.rows.length === 0) return c.json({ error: 'No encontrado' }, 404)

    const anexos = result.rows[0].anexos_generados
    const idx = parseInt(index)
    if (!anexos || !anexos[idx]) return c.json({ error: 'Índice inválido' }, 400)

    const anexo = anexos[idx]
    const reemplazos: Array<{ campo_original: string; valor_nuevo: string; encontrado: boolean }> =
      anexo.reemplazos || []
    const base64Original: string = anexo.base64_original || ''
    const nombreArchivo: string = anexo.nombre || 'anexo.docx'
    const nombreDescarga = nombreArchivo
      .replace(/^\d+_/, '')
      .replace('.docx', '_LLENADO.docx')

    if (!base64Original) return c.json({ error: 'Archivo original no disponible' }, 400)

    const buffer = Buffer.from(base64Original, 'base64')
    const zip = new AdmZip(buffer)

    const docEntry = zip.getEntry('word/document.xml')
    if (!docEntry) return c.json({ error: 'Formato de documento inválido' }, 400)

    let docXml = docEntry.getData().toString('utf8')
    docXml = applyReplacementsToXml(docXml, reemplazos)
    zip.updateFile('word/document.xml', Buffer.from(docXml, 'utf8'))
    const editedBuffer = zip.toBuffer()

    return new Response(editedBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${nombreDescarga}"`,
      },
    })
  } catch (error) {
    console.error('Error generando descarga:', error)
    return c.json({ error: 'Error al generar el archivo' }, 500)
  }
})

// GET /api/anexos/:pliegoId/:empresaId — obtener estado y anexos generados
anexosRouter.get('/:pliegoId/:empresaId', async (c) => {
  const user = c.get('user')
  const pliegoId = c.req.param('pliegoId')
  const empresaId = c.req.param('empresaId')

  try {
    const abogado = await pool.query(
      'SELECT id FROM abogados WHERE email = $1',
      [user.email]
    )
    if (abogado.rows.length === 0) return c.json({ error: 'No autorizado' }, 401)

    const result = await pool.query(
      `SELECT c.anexos, c.estado_anexos, c.anexos_generados FROM comparaciones c
       JOIN pliegos p ON c.pliego_id = p.id
       WHERE c.pliego_id = $1 AND c.empresa_id = $2 AND p.abogado_id = $3`,
      [pliegoId, empresaId, abogado.rows[0].id]
    )

    if (result.rows.length === 0) return c.json({ error: 'No encontrado' }, 404)
    return c.json(result.rows[0])
  } catch (error) {
    console.error('Error obteniendo anexos:', error)
    return c.json({ error: 'Error al obtener anexos' }, 500)
  }
})

export default anexosRouter
