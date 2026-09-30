import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { crearQueryClient } from '../app/query-client'
import { rutas } from '../app/rutas'
import { SesionProvider } from '../features/auth/SesionProvider'
import type { Perfil } from '../features/auth/perfil'
import type { PerfilSesion } from '../features/auth/tipos'

export const PERFIL_DEPORTISTA: PerfilSesion = {
  id: 'id-deportista@gymtrack.test',
  correo: 'deportista@gymtrack.test',
  nombres: 'Daniela',
  apellidos: 'Deportista Prueba',
  rol: 'DEPORTISTA',
}

export const PERFIL_COMPLETO: Perfil = {
  ...PERFIL_DEPORTISTA,
  documento: '1000000001',
  telefono: null,
  fechaNacimiento: '2003-05-14',
  sexo: 'FEMENINO',
  objetivo: 'GANAR_MASA_MUSCULAR',
  nivelActividad: 'MODERADO',
}

interface OpcionesApi {
  /** Respuesta de GET /api/auth/yo: un perfil, o un código de error. */
  perfil?: PerfilSesion | number
  /** false simula que el servidor no responde. */
  saludOk?: boolean
  /** Respuesta de PATCH /api/perfil: por defecto guarda y devuelve el perfil actualizado. */
  respuestaPatchPerfil?: (cambios: Record<string, unknown>) => Response
}

/** Simula el API: responde /auth/yo y /health según las opciones. */
export function simularApi({ perfil = PERFIL_DEPORTISTA, saludOk = true, respuestaPatchPerfil }: OpcionesApi = {}) {
  let perfilCompleto: Perfil = { ...PERFIL_COMPLETO }
  const fetchMock = vi.fn<typeof fetch>(async (entrada, init) => {
    const url = String(entrada)
    if (url.endsWith('/perfil')) {
      if (init?.method === 'PATCH') {
        const cambios = JSON.parse(String(init.body)) as Record<string, unknown>
        if (respuestaPatchPerfil) return respuestaPatchPerfil(cambios)
        perfilCompleto = { ...perfilCompleto, ...cambios } as Perfil
      }
      return new Response(JSON.stringify(perfilCompleto))
    }
    if (url.endsWith('/auth/yo')) {
      return typeof perfil === 'number'
        ? new Response(JSON.stringify({ message: 'Tu cuenta no tiene un perfil activo en GymTrack.' }), { status: perfil })
        : new Response(JSON.stringify(perfil))
    }
    if (url.endsWith('/health')) {
      if (!saludOk) throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify({ status: 'ok', database: 'ok' }))
    }
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Monta la app completa (sesión, TanStack Query y rutas) en la ruta indicada. */
export function renderApp(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider client={crearQueryClient()}>
      <SesionProvider>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>,
  )
  return router
}
