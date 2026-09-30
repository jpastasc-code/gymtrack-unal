import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api/client'

export type GrupoMuscular =
  | 'PECHO'
  | 'ESPALDA'
  | 'HOMBROS'
  | 'BICEPS'
  | 'TRICEPS'
  | 'ANTEBRAZOS'
  | 'CUADRICEPS'
  | 'ISQUIOTIBIALES'
  | 'GLUTEOS'
  | 'PANTORRILLAS'
  | 'ABDOMEN'
  | 'CUERPO_COMPLETO'
  | 'CARDIO'

export const GRUPOS: { valor: GrupoMuscular; nombre: string }[] = [
  { valor: 'PECHO', nombre: 'Pecho' },
  { valor: 'ESPALDA', nombre: 'Espalda' },
  { valor: 'HOMBROS', nombre: 'Hombros' },
  { valor: 'BICEPS', nombre: 'Bíceps' },
  { valor: 'TRICEPS', nombre: 'Tríceps' },
  { valor: 'ANTEBRAZOS', nombre: 'Antebrazos' },
  { valor: 'CUADRICEPS', nombre: 'Cuádriceps' },
  { valor: 'ISQUIOTIBIALES', nombre: 'Isquiotibiales' },
  { valor: 'GLUTEOS', nombre: 'Glúteos' },
  { valor: 'PANTORRILLAS', nombre: 'Pantorrillas' },
  { valor: 'ABDOMEN', nombre: 'Abdomen' },
  { valor: 'CUERPO_COMPLETO', nombre: 'Cuerpo completo' },
  { valor: 'CARDIO', nombre: 'Cardio' },
]

export const NOMBRE_GRUPO = Object.fromEntries(GRUPOS.map((g) => [g.valor, g.nombre])) as Record<GrupoMuscular, string>

export interface Ejercicio {
  id: string
  nombre: string
  grupoMuscular: GrupoMuscular
  descripcion: string | null
  activo: boolean
}

export interface FiltroEjercicios {
  q: string
  grupo: GrupoMuscular | null
  incluirInactivos: boolean
}

export interface DatosEjercicio {
  nombre: string
  grupoMuscular: GrupoMuscular
  descripcion: string | null
}

/** Roles que pueden crear, editar y eliminar ejercicios (igual que en el API). */
export const ROLES_EDITORES = ['INSTRUCTOR', 'ADMIN'] as const

const CLAVE = ['ejercicios'] as const

export function useEjercicios({ q, grupo, incluirInactivos }: FiltroEjercicios) {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  if (grupo) params.set('grupo', grupo)
  if (incluirInactivos) params.set('incluirInactivos', 'true')
  const consulta = params.toString()
  return useQuery({
    queryKey: [...CLAVE, 'lista', consulta],
    queryFn: ({ signal }) => apiFetch<Ejercicio[]>(`/ejercicios${consulta ? `?${consulta}` : ''}`, { signal }),
    // Mientras llega la nueva búsqueda, se sigue viendo la anterior (sin parpadeo).
    placeholderData: keepPreviousData,
  })
}

export function useEjercicio(id: string | undefined) {
  return useQuery({
    queryKey: [...CLAVE, 'detalle', id],
    queryFn: ({ signal }) => apiFetch<Ejercicio>(`/ejercicios/${id}`, { signal }),
    enabled: !!id,
  })
}

function useInvalidarCatalogo() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: CLAVE })
}

export function useCrearEjercicio() {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: (datos: DatosEjercicio) => apiFetch<Ejercicio>('/ejercicios', { method: 'POST', body: datos }),
    onSuccess: invalidar,
  })
}

export function useActualizarEjercicio(id: string) {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: (cambios: Partial<DatosEjercicio> & { activo?: boolean }) =>
      apiFetch<Ejercicio>(`/ejercicios/${id}`, { method: 'PATCH', body: cambios }),
    onSuccess: invalidar,
  })
}

export function useEliminarEjercicio(id: string) {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/ejercicios/${id}`, { method: 'DELETE' }),
    onSuccess: invalidar,
  })
}
