import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api/client'
import type { GrupoMuscular } from './ejercicios/api'

export type Metodo = 'TRADICIONAL' | 'PIRAMIDE' | 'PIRAMIDE_INVERSA' | 'SERIES_DESCENDENTES' | 'SUPERSERIE' | 'CIRCUITO'

export const METODOS: { valor: Metodo; nombre: string }[] = [
  { valor: 'TRADICIONAL', nombre: 'Tradicional' },
  { valor: 'PIRAMIDE', nombre: 'Pirámide' },
  { valor: 'PIRAMIDE_INVERSA', nombre: 'Pirámide inversa' },
  { valor: 'SERIES_DESCENDENTES', nombre: 'Series descendentes' },
  { valor: 'SUPERSERIE', nombre: 'Superserie' },
  { valor: 'CIRCUITO', nombre: 'Circuito' },
]

export const NOMBRE_METODO = Object.fromEntries(METODOS.map((m) => [m.valor, m.nombre])) as Record<Metodo, string>

/** Igual que en el API: una rutina se reparte en máximo 7 días. */
export const MAX_DIAS = 7

export interface EjercicioEnRutina {
  id: string
  orden: number
  ejercicio: { id: string; nombre: string; grupoMuscular: GrupoMuscular }
  series: number
  repeticionesObjetivo: string
  metodo: Metodo
  descansoSegundos: number | null
  notas: string | null
}

export interface Rutina {
  id: string
  nombre: string
  descripcion: string | null
  vigente: boolean
  fechaAsignacion: string
  instructor: { id: string; nombres: string; apellidos: string }
  dias: { dia: number; ejercicios: EjercicioEnRutina[] }[]
}

export interface NuevaRutina {
  nombre: string
  descripcion: string | null
  /** En el orden en que se hacen; `dia` los reparte en días seguidos desde el 1. */
  ejercicios: {
    ejercicioId: string
    dia: number
    series: number
    repeticionesObjetivo: string
    metodo: Metodo
    descansoSegundos: number | null
  }[]
}

export function useRutinasDeportista(id: string) {
  return useQuery({
    queryKey: ['rutinas', 'deportista', id],
    queryFn: ({ signal }) => apiFetch<Rutina[]>(`/deportistas/${id}/rutinas`, { signal }),
  })
}

export function useAsignarRutina(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: NuevaRutina) => apiFetch<Rutina>(`/deportistas/${id}/rutinas`, { method: 'POST', body: datos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rutinas', 'deportista', id] }),
  })
}
