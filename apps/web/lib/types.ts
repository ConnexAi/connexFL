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

export interface ContratoEjecutado {
  descripcion: string
  valor_aproximado: string
  entidad: string
  ano: string
}

export interface AnalisisEmpresa {
  nombre_comercial: string
  nit: string
  sector_principal: string
  sectores_secundarios: string[]
  anos_experiencia: number
  contratos_ejecutados: ContratoEjecutado[]
  capacidad_tecnica: string
  indicadores_financieros: {
    descripcion: string
    nivel: 'alto' | 'medio' | 'bajo'
  }
  habilitacion_legal: 'habilitada' | 'inhabilitada' | 'sin_verificar'
  fortalezas: string[]
  debilidades: string[]
  tipos_contrato_recomendados: string[]
  valor_maximo_contrato_estimado: string
  resumen_ejecutivo: string
}

export interface EmpresaDetail extends EmpresaListItem {
  abogado_id?: string
  archivos_path?: string[] | null
  contexto_raw?: string | null
  contexto_procesado?: AnalisisEmpresa | null
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

export interface ComparacionConEmpresa {
  id: string
  pliego_id: string
  empresa_id: string
  score: number | null
  justificacion: string | null
  fortalezas_relevantes: string[] | null
  riesgos: string[] | null
  empresa_nombre: string
  nit: string
  sector: string | null
  created_at: string
}

export interface AnexoReemplazo {
  campo_original: string
  valor_nuevo: string
  encontrado: boolean
}

export interface AnexoGenerado {
  nombre: string
  ruta_original: string
  base64_original: string
  media_type: string
  reemplazos: AnexoReemplazo[]
  campos_pendientes: string[]
}

export interface AnexosEstado {
  estado_anexos: string | null
  anexos_generados: AnexoGenerado[] | null
}
