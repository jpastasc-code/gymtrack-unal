import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../lib/api/client'
import type { Rol } from './tipos'

export type Sexo = 'MASCULINO' | 'FEMENINO'
export type Objetivo = 'MANTENER' | 'GANAR_MASA_MUSCULAR' | 'PERDER_GRASA'
export type NivelActividad = 'SEDENTARIO' | 'LIGERO' | 'MODERADO' | 'ALTO' | 'MUY_ALTO'

/** Respuesta de GET /api/perfil. */
export interface Perfil {
  id: string
  documento: string
  correo: string
  nombres: string
  apellidos: string
  telefono: string | null
  /** AAAA-MM-DD */
  fechaNacimiento: string | null
  sexo: Sexo | null
  objetivo: Objetivo | null
  nivelActividad: NivelActividad | null
  rol: Rol
}

export type CambiosPerfil = Partial<
  Pick<Perfil, 'nombres' | 'apellidos' | 'telefono' | 'fechaNacimiento' | 'sexo' | 'objetivo' | 'nivelActividad'>
>

const CLAVE_PERFIL = ['perfil'] as const

export function usePerfil() {
  return useQuery({
    queryKey: CLAVE_PERFIL,
    queryFn: ({ signal }) => apiFetch<Perfil>('/perfil', { signal }),
  })
}

export function useActualizarPerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cambios: CambiosPerfil) => apiFetch<Perfil>('/perfil', { method: 'PATCH', body: cambios }),
    onSuccess: (perfil) => {
      queryClient.setQueryData(CLAVE_PERFIL, perfil)
      // El nombre también se muestra desde la sesión (GET /auth/yo).
      void queryClient.invalidateQueries({ queryKey: ['auth', 'yo'] })
    },
  })
}

export const OPCIONES_SEXO: { valor: Sexo; titulo: string }[] = [
  { valor: 'FEMENINO', titulo: 'Femenino' },
  { valor: 'MASCULINO', titulo: 'Masculino' },
]

export const OPCIONES_OBJETIVO: { valor: Objetivo; titulo: string; detalle: string }[] = [
  { valor: 'MANTENER', titulo: 'Mantener', detalle: 'Conservar mi peso y condición actual' },
  { valor: 'GANAR_MASA_MUSCULAR', titulo: 'Ganar masa muscular', detalle: 'Aumentar fuerza y volumen' },
  { valor: 'PERDER_GRASA', titulo: 'Perder grasa', detalle: 'Bajar mi porcentaje de grasa' },
]

export const OPCIONES_ACTIVIDAD: { valor: NivelActividad; titulo: string; detalle: string }[] = [
  { valor: 'SEDENTARIO', titulo: 'Sedentario', detalle: 'Casi no hago ejercicio' },
  { valor: 'LIGERO', titulo: 'Ligero', detalle: '1 a 3 días de ejercicio por semana' },
  { valor: 'MODERADO', titulo: 'Moderado', detalle: '3 a 5 días de ejercicio por semana' },
  { valor: 'ALTO', titulo: 'Alto', detalle: '6 o 7 días de ejercicio por semana' },
  { valor: 'MUY_ALTO', titulo: 'Muy alto', detalle: 'Entreno dos veces al día o mi trabajo es físico' },
]
