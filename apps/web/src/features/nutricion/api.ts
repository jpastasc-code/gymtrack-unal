import type { DatoFaltante, DatosRequerimiento, RequerimientoCalorico } from '@gymtrack/shared'
import { useQuery } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../lib/api/client'

/** Respuesta de GET /api/perfil/requerimiento-calorico (GYMM-25). */
export interface MiRequerimiento extends RequerimientoCalorico {
  datos: DatosRequerimiento & { fechaEvaluacion: string }
}

export function useMiRequerimiento() {
  return useQuery({
    // useActualizarPerfil la invalida: el objetivo y los datos del perfil cambian el cálculo.
    queryKey: ['perfil', 'requerimiento-calorico'],
    queryFn: ({ signal }) => apiFetch<MiRequerimiento>('/perfil/requerimiento-calorico', { signal }),
  })
}

/** Si el API respondió 422 porque faltan datos, cuáles son; si fue otro error, null. */
export function faltantesDe(error: Error | null): DatoFaltante[] | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null
  const faltantes = (error.body as { faltantes?: DatoFaltante[] } | undefined)?.faltantes
  return Array.isArray(faltantes) ? faltantes : null
}
