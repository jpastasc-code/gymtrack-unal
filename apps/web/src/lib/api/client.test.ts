import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch, configurarProveedorToken } from './client'

function mockFetch(respuesta: Response | Promise<Response>) {
  const fn = vi.fn<typeof fetch>(() => Promise.resolve(respuesta))
  vi.stubGlobal('fetch', fn)
  return fn
}

describe('apiFetch', () => {
  afterEach(() => configurarProveedorToken(() => null))

  it('antepone la URL del API y devuelve el JSON', async () => {
    const fetchMock = mockFetch(new Response(JSON.stringify({ hola: 'mundo' })))
    await expect(apiFetch('/saludo')).resolves.toEqual({ hola: 'mundo' })
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/saludo')
  })

  it('envía el cuerpo como JSON', async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }))
    await apiFetch('/reservas', { method: 'POST', body: { franjaId: 'f1' } })
    const init = fetchMock.mock.calls[0][1]!
    expect(init.body).toBe('{"franjaId":"f1"}')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('agrega el token de la sesión cuando existe', async () => {
    configurarProveedorToken(async () => 'token-123')
    const fetchMock = mockFetch(new Response('{}'))
    await apiFetch('/perfil')
    expect(new Headers(fetchMock.mock.calls[0][1]!.headers).get('Authorization')).toBe(
      'Bearer token-123',
    )
  })

  it('convierte las respuestas de error en ApiError con el mensaje del servidor', async () => {
    mockFetch(new Response(JSON.stringify({ message: 'La franja está llena' }), { status: 409 }))
    const error = await apiFetch('/reservas').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'La franja está llena' })
  })

  it('reporta los errores de red con status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    const error = (await apiFetch('/health').catch((e: unknown) => e)) as ApiError
    expect(error.esErrorDeRed).toBe(true)
    expect(error.message).toMatch(/No hay conexión/)
  })
})
