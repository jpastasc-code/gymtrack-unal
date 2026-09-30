import type { AuthError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { mensajeErrorLogin } from './mensajes'

const error = (datos: Partial<AuthError>) => ({ name: 'AuthApiError', message: '', status: 400, ...datos }) as AuthError

describe('mensajeErrorLogin', () => {
  it('explica cada error conocido de Supabase Auth en español', () => {
    expect(mensajeErrorLogin(error({ code: 'invalid_credentials' }))).toMatch(/Correo o contraseña incorrectos/)
    expect(mensajeErrorLogin(error({ code: 'email_not_confirmed' }))).toMatch(/no está confirmado/)
    expect(mensajeErrorLogin(error({ code: 'over_request_rate_limit' }))).toMatch(/Espera un minuto/)
  })

  it('distingue la falta de conexión de otros errores', () => {
    expect(mensajeErrorLogin(error({ name: 'AuthRetryableFetchError', status: 0 }))).toMatch(/No hay conexión/)
    expect(mensajeErrorLogin(error({ code: 'unexpected_failure', status: 500 }))).toMatch(/No se pudo iniciar sesión/)
  })
})
