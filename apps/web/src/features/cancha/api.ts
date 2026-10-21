import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api/client'

export type EstadoFranja = 'DISPONIBLE' | 'RESERVADA' | 'PASADA'

export interface CanchaResumen {
  id: string
  nombre: string
  descripcion: string | null
}

export interface FranjaDelDia {
  id: string
  horaInicio: string
  horaFin: string
  estado: EstadoFranja
}

export interface DiaDisponible {
  /** AAAA-MM-DD en hora de Colombia. */
  fecha: string
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number
  franjas: FranjaDelDia[]
}

/** Respuesta de GET /api/cancha/disponibilidad (GYMM-20). */
export interface DisponibilidadSemana {
  cancha: CanchaResumen
  hoy: string
  semana: { desde: string; hasta: string }
  dias: DiaDisponible[]
}

export interface Franja {
  id: string
  diaSemana: number
  horaInicio: string
  horaFin: string
  activa: boolean
}

export interface FranjasCancha {
  cancha: CanchaResumen
  franjas: Franja[]
}

export interface NuevaFranja {
  diaSemana: number
  horaInicio: string
  horaFin: string
}

/** Roles que definen el horario de la cancha (igual que en el API). */
export const ROLES_GESTORES = ['PERSONAL_DEPORTES', 'ADMIN'] as const

const CLAVE = ['cancha'] as const

/** `semana`: cualquier día de la semana que se quiere ver; null = la actual. */
export function useDisponibilidadCancha(semana: string | null) {
  return useQuery({
    queryKey: [...CLAVE, 'disponibilidad', semana],
    queryFn: ({ signal }) =>
      apiFetch<DisponibilidadSemana>(`/cancha/disponibilidad${semana ? `?semana=${semana}` : ''}`, { signal }),
    // Al cambiar de semana se sigue viendo la anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
  })
}

export function useFranjasCancha() {
  return useQuery({
    queryKey: [...CLAVE, 'franjas'],
    queryFn: ({ signal }) => apiFetch<FranjasCancha>('/cancha/franjas', { signal }),
  })
}

function useInvalidarCancha() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CLAVE })
}

export function useCrearFranja() {
  const invalidar = useInvalidarCancha()
  return useMutation({
    mutationFn: (datos: NuevaFranja) => apiFetch<Franja>('/cancha/franjas', { method: 'POST', body: datos }),
    onSuccess: invalidar,
  })
}

export function useCambiarFranja() {
  const invalidar = useInvalidarCancha()
  return useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) =>
      apiFetch<Franja>(`/cancha/franjas/${id}`, { method: 'PATCH', body: { activa } }),
    onSuccess: invalidar,
  })
}

export function useEliminarFranja() {
  const invalidar = useInvalidarCancha()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/cancha/franjas/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  })
}

// ───────────────────────── Fechas para mostrar ─────────────────────────
// Las fechas llegan como "AAAA-MM-DD" (hora de Colombia). Se leen por partes, sin
// pasar por Date con zona horaria, para que nunca se corran un día.

export const NOMBRE_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const partes = (fecha: string) => fecha.split('-').map(Number) as [number, number, number]

/** "2026-10-26" → "26 de octubre". */
export function diaYMes(fecha: string): string {
  const [, mes, dia] = partes(fecha)
  return `${dia} de ${MESES[mes - 1]}`
}

/** "Semana del 26 de octubre al 1 de noviembre" (sin repetir el mes si es el mismo). */
export function textoSemana(desde: string, hasta: string): string {
  const [, mesDesde, diaDesde] = partes(desde)
  const [, mesHasta] = partes(hasta)
  const inicio = mesDesde === mesHasta ? String(diaDesde) : diaYMes(desde)
  return `Semana del ${inicio} al ${diaYMes(hasta)}`
}

/** Suma días a una fecha "AAAA-MM-DD" (cuentas en UTC, sin efecto de la zona horaria). */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = partes(fecha)
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10)
}
