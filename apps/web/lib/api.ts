import type {
  EmpresaListItem,
  EmpresaDetail,
  PliegoListItem,
  PliegoDetail,
  ComparacionConEmpresa,
  AnexosEstado,
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
  },
  pliegos: {
    list: () => apiFetch<PliegoListItem[]>('/api/pliegos'),
    get: (id: string) => apiFetch<PliegoDetail>(`/api/pliegos/${id}`),
  },
  comparaciones: {
    list: (pliegoId?: string) =>
      apiFetch<ComparacionConEmpresa[]>(
        pliegoId ? `/api/comparaciones?pliegoId=${pliegoId}` : '/api/comparaciones'
      ),
  },
  abogados: {
    me: () => apiFetch<{ id: string; email: string; nombre: string }>('/api/abogados/me'),
  },
  anexos: {
    get: (pliegoId: string, empresaId: string) =>
      apiFetch<AnexosEstado>(`/api/anexos/${pliegoId}/${empresaId}`),
  },
}
