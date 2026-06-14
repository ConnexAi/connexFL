import type {
  EmpresaListItem,
  EmpresaDetail,
  PliegoListItem,
  PliegoDetail,
  ComparacionConEmpresa,
  AnexosEstado,
  LicitacionListItem,
  LicitacionDetail,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ApiUnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED')
    this.name = 'ApiUnauthorizedError'
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (res.status === 401) throw new ApiUnauthorizedError()
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  empresas: {
    list: () => apiFetch<EmpresaListItem[]>('/api/empresas'),
    get: (id: string) => apiFetch<EmpresaDetail>(`/api/empresas/${id}`),
    delete: (id: string) => apiFetch<{ ok: boolean }>(`/api/empresas/${id}`, { method: 'DELETE' }),
  },
  pliegos: {
    list: () => apiFetch<PliegoListItem[]>('/api/pliegos'),
    get: (id: string) => apiFetch<PliegoDetail>(`/api/pliegos/${id}`),
  },
  comparaciones: {
    list: (params?: { pliegoId?: string; licitacionId?: string; ronda?: string; seleccionada?: boolean }) => {
      const qs = new URLSearchParams()
      if (params?.pliegoId)     qs.set('pliegoId',     params.pliegoId)
      if (params?.licitacionId) qs.set('licitacionId', params.licitacionId)
      if (params?.ronda)        qs.set('ronda',        params.ronda)
      if (params?.seleccionada !== undefined) qs.set('seleccionada', String(params.seleccionada))
      const q = qs.toString()
      return apiFetch<ComparacionConEmpresa[]>(`/api/comparaciones${q ? '?' + q : ''}`)
    },
    patch: (id: string, body: { seleccionada: boolean }) =>
      apiFetch<ComparacionConEmpresa>(`/api/comparaciones/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
  },
  abogados: {
    me: () => apiFetch<{ id: string; email: string; nombre: string }>('/api/abogados/me'),
  },
  anexos: {
    get: (pliegoId: string, empresaId: string) =>
      apiFetch<AnexosEstado>(`/api/anexos/${pliegoId}/${empresaId}`),
  },
  licitaciones: {
    list: () => apiFetch<LicitacionListItem[]>('/api/licitaciones'),
    get: (id: string) => apiFetch<LicitacionDetail>(`/api/licitaciones/${id}`),
    create: (body: { nombre: string; secopId?: string; entidadContratante?: string }) =>
      apiFetch<LicitacionListItem>('/api/licitaciones', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    addFase: async (id: string, formData: FormData) => {
      const res = await fetch(`${API_URL}/api/licitaciones/${id}/fases`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      if (res.status === 401) throw new ApiUnauthorizedError()
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      return res.json()
    },
    analizarEmpresas: (id: string, faseId: string, empresaIds: string[]) =>
      apiFetch<{ ok: boolean; procesando: number }>(
        `/api/licitaciones/${id}/fases/${faseId}/analizar-empresas`,
        { method: 'POST', body: JSON.stringify({ empresaIds }) }
      ),
    resumenDocxUrl: (id: string, faseId: string, empresaId?: string) => {
      const qs = empresaId ? `?empresaId=${encodeURIComponent(empresaId)}` : ''
      return `${API_URL}/api/licitaciones/${id}/fases/${faseId}/resumen-docx${qs}`
    },
    delete: (id: string) => apiFetch<{ ok: boolean }>(`/api/licitaciones/${id}`, { method: 'DELETE' }),
    deleteFase: (id: string, faseId: string) =>
      apiFetch<{ ok: boolean }>(`/api/licitaciones/${id}/fases/${faseId}`, { method: 'DELETE' }),
  },
}
