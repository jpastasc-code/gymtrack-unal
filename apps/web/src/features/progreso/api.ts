import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api/client'
import type { GrupoMuscular } from '../rutinas/ejercicios/api'

export interface EjercicioResumen {
  id: string
  nombre: string
  grupoMuscular: GrupoMuscular
}

/** La serie con más carga y la fecha de la sesión en que la hice. */
export interface Marca {
  cargaKg: number
  repeticiones: number
  fecha: string
}

/** Respuesta de GET /api/progreso/ejercicios. */
export interface EjercicioConHistorico {
  ejercicio: EjercicioResumen
  sesiones: number
  ultimaFecha: string
  mejorMarca: Marca
}

/** Respuesta de GET /api/progreso/ejercicios/:id. */
export interface HistoricoEjercicio {
  ejercicio: EjercicioResumen
  mejorMarca: (Marca & { sesionId: string; numeroSerie: number }) | null
  /** De la más reciente a la más antigua. */
  sesiones: {
    sesionId: string
    fecha: string
    series: { numeroSerie: number; cargaKg: number; repeticiones: number }[]
  }[]
}

/** Prefijo de las consultas de progreso: al terminar una sesión se invalidan todas. */
export const CLAVE_PROGRESO = ['progreso'] as const

export function useEjerciciosConHistorico() {
  return useQuery({
    queryKey: [...CLAVE_PROGRESO, 'ejercicios'],
    queryFn: ({ signal }) => apiFetch<EjercicioConHistorico[]>('/progreso/ejercicios', { signal }),
  })
}

export function useHistoricoEjercicio(id: string) {
  return useQuery({
    queryKey: [...CLAVE_PROGRESO, 'ejercicios', id],
    queryFn: ({ signal }) => apiFetch<HistoricoEjercicio>(`/progreso/ejercicios/${id}`, { signal }),
  })
}

const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
const fechaCorta = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

/** "5 de noviembre de 2026". */
export const formatoFecha = (iso: string) => fechaLarga.format(new Date(iso))
/** "jueves, 5 de noviembre". */
export const formatoDia = (iso: string) => fechaCorta.format(new Date(iso))
/** "50 kg × 8" o, sin carga, "8 repeticiones". */
export const formatoSerie = ({ cargaKg, repeticiones }: { cargaKg: number; repeticiones: number }) =>
  cargaKg === 0
    ? `${repeticiones} ${repeticiones === 1 ? 'repetición' : 'repeticiones'}`
    : `${cargaKg.toLocaleString('es-CO')} kg × ${repeticiones}`
