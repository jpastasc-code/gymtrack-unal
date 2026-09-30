/**
 * Las URLs pueden ser relativas (p. ej. `/api` en `pnpm demo`): se resuelven contra el origen de
 * la página, porque el cliente de Supabase exige una URL absoluta.
 */
export const urlAbsoluta = (url: string, origen = globalThis.location?.origin ?? 'http://localhost') =>
  url.startsWith('/') ? new URL(url, origen).href.replace(/\/+$/, '') : url

/** Configuración leída de las variables de entorno de Vite (ver apps/web/.env.example). */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, ''),
  supabaseUrl: urlAbsoluta(import.meta.env.VITE_SUPABASE_URL ?? ''),
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
} as const
