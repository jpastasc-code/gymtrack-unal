import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api/client'

/** TUYA: ya tienes un cupo; LLENA: no quedan cupos; PASADA: la franja ya terminó. */
export type EstadoFranjaGimnasio = 'DISPONIBLE' | 'LLENA' | 'TUYA' | 'PASADA'

export interface FranjaConCupo {
  id: string
  horaInicio: string
  horaFin: string
  cupoMaximo: number
  libres: number
  estado: EstadoFranjaGimnasio
  /** Solo si es TUYA: la reserva, para poder cancelarla. */
  reservaId?: string
}

export interface DiaGimnasio {
  /** AAAA-MM-DD en hora de Colombia. */
  fecha: string
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number
  franjas: FranjaConCupo[]
}

/** Respuesta de GET /api/gimnasio/disponibilidad (GYMM-27): hoy y los 6 días siguientes. */
export interface DisponibilidadGimnasio {
  hoy: string
  dias: DiaGimnasio[]
}

export interface ReservaGimnasio {
  id: string
  fecha: string
  diaSemana: number
  horaInicio: string
  horaFin: string
}

export interface FranjaGimnasio {
  id: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  cupoMaximo: number
  activa: boolean
}

/** Igual que en el API: un cupo va de 1 a 200 personas. */
export const MAX_CUPO = 200

const CLAVE = ['gimnasio'] as const

export function useDisponibilidadGimnasio() {
  return useQuery({
    queryKey: [...CLAVE, 'disponibilidad'],
    queryFn: ({ signal }) => apiFetch<DisponibilidadGimnasio>('/gimnasio/disponibilidad', { signal }),
  })
}

export function useMisReservasGimnasio() {
  return useQuery({
    queryKey: [...CLAVE, 'reservas', 'mias'],
    queryFn: ({ signal }) => apiFetch<ReservaGimnasio[]>('/gimnasio/reservas/mias', { signal }),
  })
}

export function useFranjasGimnasio() {
  return useQuery({
    queryKey: [...CLAVE, 'franjas'],
    queryFn: ({ signal }) => apiFetch<FranjaGimnasio[]>('/gimnasio/franjas', { signal }),
  })
}

function useInvalidarGimnasio() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CLAVE })
}

/**
 * Reserva un cupo. Pase lo que pase se vuelven a pedir los cupos: si la franja se
 * llenó mientras tanto (409), debe dejar de verse libre.
 */
export function useReservarCupo() {
  const invalidar = useInvalidarGimnasio()
  return useMutation({
    mutationFn: (datos: { franjaId: string; fecha: string }) =>
      apiFetch<ReservaGimnasio>('/gimnasio/reservas', { method: 'POST', body: datos }),
    onSettled: invalidar,
  })
}

export function useCancelarCupo() {
  const invalidar = useInvalidarGimnasio()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/gimnasio/reservas/${id}/cancelar`, { method: 'POST' }),
    onSettled: invalidar,
  })
}

export function useCambiarCupo() {
  const invalidar = useInvalidarGimnasio()
  return useMutation({
    mutationFn: ({ id, cupoMaximo }: { id: string; cupoMaximo: number }) =>
      apiFetch<FranjaGimnasio>(`/gimnasio/franjas/${id}`, { method: 'PATCH', body: { cupoMaximo } }),
    onSuccess: invalidar,
  })
}
