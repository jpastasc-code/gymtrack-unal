import { env } from '../env'

/** Error de una respuesta del API que no fue 2xx (o de red, con status 0). */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  get esErrorDeRed(): boolean {
    return this.status === 0
  }
}

/**
 * Devuelve el token de acceso de la sesión actual. Lo configura el módulo de autenticación
 * (GYMM-10, Supabase Auth); mientras no exista, las peticiones van sin token.
 */
type ProveedorToken = () => Promise<string | null> | string | null
let obtenerToken: ProveedorToken = () => null

export function configurarProveedorToken(proveedor: ProveedorToken): void {
  obtenerToken = proveedor
}

export interface OpcionesPeticion extends Omit<RequestInit, 'body'> {
  /** Se envía como JSON. */
  body?: unknown
}

/**
 * Cliente HTTP hacia el API de GymTrack.
 * `ruta` es relativa a VITE_API_URL, p. ej. `apiFetch('/health')`.
 */
export async function apiFetch<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const { body, headers, ...resto } = opciones
  const token = await obtenerToken()

  const cabeceras = new Headers(headers)
  cabeceras.set('Accept', 'application/json')
  if (body !== undefined) cabeceras.set('Content-Type', 'application/json')
  if (token) cabeceras.set('Authorization', `Bearer ${token}`)

  let respuesta: Response
  try {
    respuesta = await fetch(`${env.apiUrl}${ruta.startsWith('/') ? ruta : `/${ruta}`}`, {
      ...resto,
      headers: cabeceras,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.')
  }

  const texto = await respuesta.text()
  let datos: unknown = undefined
  if (texto) {
    try {
      datos = JSON.parse(texto)
    } catch {
      datos = texto
    }
  }

  if (!respuesta.ok) {
    const mensaje =
      typeof datos === 'object' && datos !== null && 'message' in datos && typeof datos.message === 'string'
        ? datos.message
        : `El servidor respondió con el código ${respuesta.status}.`
    throw new ApiError(respuesta.status, mensaje, datos)
  }

  return datos as T
}
