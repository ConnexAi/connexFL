// ---------------------------------------------------------------------------
// Domain types shared across dashboard pages
// ---------------------------------------------------------------------------

export type EstadoEmpresa = 'pendiente' | 'procesando' | 'listo' | 'error'
export type EstadoPliego = 'pendiente' | 'analizando' | 'listo' | 'error'

export interface EmpresaListItem {
  id: string
  nombre: string
  nit: string
  sector: string | null
  estado: EstadoEmpresa
  created_at: string
}

export interface EmpresaDetail extends EmpresaListItem {
  abogado_id?: string
  archivos_path?: string[] | null
  contexto_raw?: string | null
  contexto_procesado?: string | null
}

export interface PliegoListItem {
  id: string
  nombre: string
  entidad: string | null
  secop_id: string | null
  fecha_limite: string | null
  estado: EstadoPliego
  score_promedio?: number | null
  created_at: string
}

export interface PliegoDetail extends PliegoListItem {
  archivos_path?: string[] | null
  analisis?: PliegoAnalisis | null
  empresas_compatibles?: EmpresaCompatible[]
}

export interface PliegoAnalisis {
  resumen: string
  requisitos_habilitantes: string[]
  criterios_ponderacion: { criterio: string; peso: number }[]
  fechas_clave: { evento: string; fecha: string }[]
  inconsistencias: string[]
}

export interface EmpresaCompatible {
  empresa_id: string
  empresa_nombre: string
  score: number
}
