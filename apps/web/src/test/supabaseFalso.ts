import type { Session } from '@supabase/supabase-js'
import { vi } from 'vitest'

type Oyente = (evento: string, session: Session | null) => void

/**
 * Cliente de Supabase falso para las pruebas: guarda la sesión en memoria y
 * avisa a los oyentes como lo hace el real.
 */
export function crearSupabaseFalso() {
  let session: Session | null = null
  const oyentes = new Set<Oyente>()
  const emitir = (evento: string) => oyentes.forEach((o) => o(evento, session))

  const auth = {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn((oyente: Oyente) => {
      oyentes.add(oyente)
      return { data: { subscription: { unsubscribe: () => oyentes.delete(oyente) } } }
    }),
    signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      if (password !== 'clave-correcta') {
        return {
          data: { session: null, user: null },
          error: { code: 'invalid_credentials', status: 400, name: 'AuthApiError', message: 'Invalid login credentials' },
        }
      }
      session = sesionDePrueba(email)
      emitir('SIGNED_IN')
      return { data: { session, user: session.user }, error: null }
    }),
    signOut: vi.fn(async () => {
      session = null
      emitir('SIGNED_OUT')
      return { error: null }
    }),
  }

  return {
    auth,
    /** Deja una sesión guardada, como si la persona ya hubiera entrado antes. */
    conSesion(email = 'deportista@gymtrack.test') {
      session = sesionDePrueba(email)
    },
    reiniciar() {
      session = null
      oyentes.clear()
      Object.values(auth).forEach((fn) => fn.mockClear())
    },
  }
}

export function sesionDePrueba(email: string): Session {
  return {
    access_token: `token-de-${email}`,
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: `id-${email}`, email, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
  } as Session
}
