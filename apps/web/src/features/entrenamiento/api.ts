import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../lib/api/client'

export interface SerieNueva {
  ejercicioId: string
  numeroSerie: number
  cargaKg: number
  repeticiones: number
}

export interface SerieRegistrada extends SerieNueva {
  registradaEn: string
}

export interface Sesion {
  id: string
  rutinaId: string | null
  inicio: string
  fin: string | null
  series: SerieRegistrada[]
}

/** Lo que hice en un ejercicio la última vez (GYMM-43). */
export interface PrecargaEjercicio {
  ejercicioId: string
  fecha: string
  series: Omit<SerieNueva, 'ejercicioId'>[]
}

export const CLAVE_SESION = ['sesiones', 'actual'] as const

/** La sesión en la que estoy entrenando, o null si no hay una abierta (el API responde 404). */
export function useSesionActual() {
  return useQuery({
    queryKey: CLAVE_SESION,
    queryFn: async ({ signal }) => {
      try {
        return await apiFetch<Sesion>('/sesiones/actual', { signal })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  })
}

export function usePrecarga() {
  return useQuery({
    queryKey: ['sesiones', 'precarga'],
    queryFn: ({ signal }) => apiFetch<PrecargaEjercicio[]>('/sesiones/precarga', { signal }),
  })
}

export function useIniciarSesion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<Sesion>('/sesiones', { method: 'POST' }),
    onSuccess: (sesion) => queryClient.setQueryData(CLAVE_SESION, sesion),
  })
}

export function useCerrarSesion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch<Sesion>(`/sesiones/${id}/cerrar`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(CLAVE_SESION, null)
      // Lo que acabo de hacer es la precarga de la próxima sesión.
      void queryClient.invalidateQueries({ queryKey: ['sesiones', 'precarga'] })
      // Y entra al histórico por ejercicio (GYMM-31).
      void queryClient.invalidateQueries({ queryKey: ['progreso'] })
    },
  })
}

/** Registra (o corrige) una serie. El API la guarda una sola vez aunque llegue repetida. */
export function enviarSerie(sesionId: string, serie: SerieNueva) {
  return apiFetch<SerieRegistrada>(`/sesiones/${sesionId}/series`, { method: 'PUT', body: serie })
}
