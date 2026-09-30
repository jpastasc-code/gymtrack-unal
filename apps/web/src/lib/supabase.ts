import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Cliente de Supabase para autenticación (DT-05). La sesión se guarda en el
 * almacenamiento del navegador y se renueva sola, así que sigue abierta al cerrar
 * y volver a abrir la app en el celular.
 *
 * Es null si faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.
 */
export const supabase: SupabaseClient | null =
  env.supabaseUrl && env.supabasePublishableKey
    ? createClient(env.supabaseUrl, env.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'gymtrack-sesion',
        },
      })
    : null
