import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { ApiError } from '../../lib/api/client'
import type { PerfilSesion } from './tipos'

export type EstadoSesion = 'cargando' | 'sin-sesion' | 'con-sesion'

export interface ValorSesion {
  estado: EstadoSesion
  session: Session | null
  /** Perfil de GymTrack (GET /api/auth/yo); null mientras carga o si falló. */
  perfil: PerfilSesion | null
  cargandoPerfil: boolean
  errorPerfil: ApiError | null
  /** Devuelve un mensaje de error para mostrar, o null si entró. */
  iniciarSesion: (correo: string, contrasena: string) => Promise<string | null>
  cerrarSesion: () => Promise<void>
}

export const ContextoSesion = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion debe usarse dentro de <SesionProvider>')
  return valor
}
