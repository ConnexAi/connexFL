// ---------------------------------------------------------------------------
// Domain types shared across dashboard pages
// ---------------------------------------------------------------------------

export type EstadoEmpresa = 'pendiente' | 'procesando' | 'listo' | 'error'
export type EstadoPliego = 'pendiente' | 'analizando' | 'listo' | 'error'

// ---------------------------------------------------------------------------
// Licitaciones
// ---------------------------------------------------------------------------

export type TipoFase =
  | 'prepliego'
  | 'pliego_definitivo'
  | 'anexos'
  | 'evaluacion_observaciones'

export type EstadoFase = 'pendiente' | 'procesando' | 'listo' | 'error'
export type EstadoLicitacion = 'activa' | 'adjudicada' | 'archivada'

// Estructura de analisis_claude en licitacion_fases
export interface LicitacionAnalisisEmpresa {
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
  fortalezas?: string[]
  debilidades?: string[]
  recomendacion_anexos?: string
  puntaje_ponderacion?: number
  ranking?: number
  oportunidades_observacion?: {
    tipo: 'puntaje_propio_subvalorado' | 'puntaje_competidor_cuestionable'
    descripcion: string
    argumento: string
  }[]
  estrategia_texto?: string
}

export interface LicitacionAnalisisGeneral {
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
  // evaluacion_observaciones
  resumen_general?: string
  ranking_competidores?: {
    nombre_proponente: string
    puntaje_habilitante: 'habilitado' | 'no_habilitado'
    puntaje_ponderacion: number
    observaciones_detectadas: string
  }[]
}

export interface LicitacionAnalisis {
  general?: LicitacionAnalisisGeneral
  por_empresa?: Record<string, LicitacionAnalisisEmpresa>
}

export interface LicitacionFase {
  id: string
  licitacion_id: string
  tipo_fase: TipoFase
  version: number
  fecha: string | null
  documentos_path: string[] | null
  texto_extraido: string | null
  analisis_claude: LicitacionAnalisis | null
  resumen_ejecutivo: string | null
  estado: EstadoFase
  created_at: string
  updated_at: string | null
}

export interface LicitacionListItem {
  id: string
  nombre: string
  secop_id: string | null
  entidad_contratante: string | null
  estado: EstadoLicitacion
  ultima_fase_listo: TipoFase | null
  created_at: string
  updated_at: string | null
}

export interface LicitacionDetail extends LicitacionListItem {
  fases: LicitacionFase[]
  pliego_id: string | null
}

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
  licitacion_id?: string | null
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
  ronda: string
  seleccionada: boolean
  created_at: string
  pliego_licitacion_id?: string | null
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

export interface InformeEvaluacion {
  comparacion_id: string
  pliego_id: string
  licitacion_id: string | null
  nombre_licitacion: string
  score: number | null
  created_at: string
}

export interface InformeEmpresa {
  id: string
  nombre: string
  sector: string | null
  nit: string | null
  total_evaluadas: number
  este_mes: number
  mes_anterior: number
  score_promedio: number | null
  ultimas_evaluaciones: InformeEvaluacion[]
}
