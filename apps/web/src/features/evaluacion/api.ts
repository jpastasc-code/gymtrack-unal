import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api/client'
import type { NivelActividad } from '../auth/perfil'
import type { TipoMedida } from './rangos'

export interface DeportistaResumen {
  id: string
  nombres: string
  apellidos: string
  documento: string
  correo: string
}

export interface Medida {
  tipo: TipoMedida
  nombre: string
  valor: number
  unidad: string
}

export interface Evaluacion {
  id: string
  fecha: string
  pesoKg: number
  tallaCm: number
  porcentajeGrasa: number | null
  imc: number
  nivelActividad: NivelActividad | null
  observaciones: string | null
  instructor: { id: string; nombres: string; apellidos: string }
  medidas: Medida[]
}

export interface NuevaEvaluacion {
  fecha?: string
  pesoKg: number
  tallaCm: number
  porcentajeGrasa: number | null
  nivelActividad: NivelActividad | null
  observaciones: string | null
  medidas: Medida[]
}

export function useDeportistas(q: string) {
  const consulta = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  return useQuery({
    queryKey: ['deportistas', consulta],
    queryFn: ({ signal }) => apiFetch<DeportistaResumen[]>(`/deportistas${consulta}`, { signal }),
  })
}

export function useDeportista(id: string) {
  return useQuery({
    queryKey: ['deportistas', 'detalle', id],
    queryFn: ({ signal }) => apiFetch<DeportistaResumen>(`/deportistas/${id}`, { signal }),
  })
}

export function useHistorialEvaluaciones(id: string) {
  return useQuery({
    queryKey: ['evaluaciones', id],
    queryFn: ({ signal }) => apiFetch<Evaluacion[]>(`/deportistas/${id}/evaluaciones`, { signal }),
  })
}

export function useRegistrarEvaluacion(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (datos: NuevaEvaluacion) =>
      apiFetch<Evaluacion>(`/deportistas/${id}/evaluaciones`, { method: 'POST', body: datos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluaciones', id] }),
  })
}
