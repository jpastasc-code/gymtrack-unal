/** Configuración leída de las variables de entorno de Vite (ver apps/web/.env.example). */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, ''),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const
