import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiFetch, configurarProveedorToken } from '../../lib/api/client'
import { supabase } from '../../lib/supabase'
import { mensajeErrorLogin } from './mensajes'
import { ContextoSesion, type EstadoSesion, type ValorSesion } from './sesion'
import type { PerfilSesion } from './tipos'

/**
 * Mantiene la sesión de Supabase Auth, entrega el token al cliente HTTP y carga
 * el perfil de GymTrack (con su rol) desde el API.
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [estado, setEstado] = useState<EstadoSesion>(supabase ? 'cargando' : 'sin-sesion')

  useEffect(() => {
    if (!supabase) return
    const cliente = supabase
    configurarProveedorToken(async () => {
      const { data } = await cliente.auth.getSession()
      return data.session?.access_token ?? null
    })

    let activo = true
    void cliente.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSession(data.session)
      setEstado(data.session ? 'con-sesion' : 'sin-sesion')
    })
    const { data } = cliente.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva)
      setEstado(nueva ? 'con-sesion' : 'sin-sesion')
    })
    return () => {
      activo = false
      data.subscription.unsubscribe()
      configurarProveedorToken(() => null)
    }
  }, [])

  const idUsuario = session?.user.id
  const consultaPerfil = useQuery({
    queryKey: ['auth', 'yo', idUsuario],
    queryFn: ({ signal }) => apiFetch<PerfilSesion>('/auth/yo', { signal }),
    enabled: !!idUsuario,
    staleTime: 5 * 60_000,
  })

  const cerrarSesion = useCallback(async () => {
    await supabase?.auth.signOut()
    queryClient.removeQueries({ queryKey: ['auth'] })
  }, [queryClient])

  // Si el API dice que el token ya no sirve, la sesión local tampoco.
  const errorPerfil = consultaPerfil.error instanceof ApiError ? consultaPerfil.error : null
  useEffect(() => {
    if (errorPerfil?.status === 401) void cerrarSesion()
  }, [errorPerfil, cerrarSesion])

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    if (!supabase) {
      return 'La app no está configurada para iniciar sesión (faltan las variables de Supabase).'
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: correo.trim().toLowerCase(),
      password: contrasena,
    })
    return error ? mensajeErrorLogin(error) : null
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      session,
      perfil: consultaPerfil.data ?? null,
      cargandoPerfil: consultaPerfil.isPending && !!idUsuario,
      errorPerfil,
      iniciarSesion,
      cerrarSesion,
    }),
    [estado, session, consultaPerfil.data, consultaPerfil.isPending, idUsuario, errorPerfil, iniciarSesion, cerrarSesion],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
