import type { AuthError } from '@supabase/supabase-js'

/** Traduce los errores de Supabase Auth a mensajes que dicen qué hacer. */
export function mensajeErrorLogin(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos. Revísalos e intenta de nuevo.'
    case 'email_not_confirmed':
      return 'Tu correo aún no está confirmado. Busca el correo de confirmación en tu bandeja.'
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.'
    case 'user_banned':
      return 'Tu cuenta está suspendida. Habla con el personal del gimnasio.'
    default:
      return error.status === 0 || error.name === 'AuthRetryableFetchError'
        ? 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
        : 'No se pudo iniciar sesión. Intenta de nuevo en un momento.'
  }
}
