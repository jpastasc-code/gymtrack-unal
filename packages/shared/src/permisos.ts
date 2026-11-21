/**
 * Permisos del personal (GYMM-47, DT-16).
 *
 * Las pantallas y los endpoints piden un permiso, nunca un rol. Cada rol tiene un conjunto de
 * permisos en PERMISOS_POR_ROL: para adaptar la app a otro gimnasio basta con cambiar esa tabla.
 * Lo usan el API (decorador @Permisos y reglas de los servicios) y la web.
 */

/** Los mismos valores del enum `rol` de la base de datos (DT-05). */
export type Rol = 'DEPORTISTA' | 'INSTRUCTOR' | 'PERSONAL_DEPORTES' | 'ADMIN'

export const PERMISOS = [
  'GESTIONAR_RUTINAS',
  'REGISTRAR_EVALUACIONES',
  'GESTIONAR_EJERCICIOS',
  'GESTIONAR_CUPOS_GIMNASIO',
  'GESTIONAR_CANCHA',
] as const

export type Permiso = (typeof PERMISOS)[number]

/**
 * Qué puede hacer cada rol. En la UNAL el instructor también hace lo del personal de deportes
 * (cupos del gimnasio y horario de la cancha).
 */
export const PERMISOS_POR_ROL: Readonly<Record<Rol, readonly Permiso[]>> = {
  DEPORTISTA: [],
  INSTRUCTOR: PERMISOS,
  PERSONAL_DEPORTES: ['GESTIONAR_CUPOS_GIMNASIO', 'GESTIONAR_CANCHA'],
  ADMIN: PERMISOS,
}

/** Los permisos de un rol. Un rol desconocido no tiene ninguno. */
export function permisosDe(rol: Rol): readonly Permiso[] {
  return PERMISOS_POR_ROL[rol] ?? []
}

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return permisosDe(rol).includes(permiso)
}

/** Es personal quien tiene al menos un permiso: puede entrar al panel. */
export function esPersonal(rol: Rol): boolean {
  return permisosDe(rol).length > 0
}
