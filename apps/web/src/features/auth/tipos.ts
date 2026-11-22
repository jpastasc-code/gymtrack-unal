import type { Permiso, Rol } from '@gymtrack/shared'

export type { Permiso, Rol }

/** Respuesta de GET /api/auth/yo. */
export interface PerfilSesion {
  id: string
  correo: string
  nombres: string
  apellidos: string
  rol: Rol
  /** Lo que puede gestionar según su rol (DT-16). Vacío para un deportista. */
  permisos: Permiso[]
}

export const NOMBRE_ROL: Record<Rol, string> = {
  DEPORTISTA: 'Deportista',
  INSTRUCTOR: 'Instructor',
  PERSONAL_DEPORTES: 'Personal de deportes',
  ADMIN: 'Administrador',
}
