import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'

export interface EstadoApi {
  status: 'ok' | 'error'
  service: string
  database: 'ok' | 'error'
  timestamp: string
}

/** Estado del API y la base de datos (GET /api/health). */
export function useEstadoApi() {
  return useQuery({
    queryKey: ['sistema', 'health'],
    queryFn: ({ signal }) => apiFetch<EstadoApi>('/health', { signal }),
    staleTime: 60_000,
    retry: false,
  })
}
