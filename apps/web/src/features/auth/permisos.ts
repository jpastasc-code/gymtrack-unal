import type { Permiso } from './tipos'
import { useSesion } from './sesion'

/**
 * Permisos del usuario según GET /api/auth/yo (DT-16). La web no los calcula a partir del rol:
 * los toma tal como los manda el API. Sin perfil (cargando o sin conexión) no hay ninguno.
 */
export function usePermisos() {
  const { perfil } = useSesion()
  const permisos: readonly Permiso[] = perfil?.permisos ?? []
  return {
    permisos,
    tiene: (permiso: Permiso) => permisos.includes(permiso),
    /** Tiene al menos un permiso: puede entrar al panel del personal. */
    esPersonal: permisos.length > 0,
  }
}
