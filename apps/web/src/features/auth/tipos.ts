export type Rol = 'DEPORTISTA' | 'INSTRUCTOR' | 'PERSONAL_DEPORTES' | 'ADMIN'

/** Respuesta de GET /api/auth/yo. */
export interface PerfilSesion {
  id: string
  correo: string
  nombres: string
  apellidos: string
  rol: Rol
}

export const NOMBRE_ROL: Record<Rol, string> = {
  DEPORTISTA: 'Deportista',
  INSTRUCTOR: 'Instructor',
  PERSONAL_DEPORTES: 'Personal de deportes',
  ADMIN: 'Administrador',
}
