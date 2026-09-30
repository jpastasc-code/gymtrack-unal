import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { crearQueryClient } from './query-client'
import { rutas } from './rutas'

function renderEn(ruta: string) {
  const router = createMemoryRouter(rutas, { initialEntries: [ruta] })
  render(
    <QueryClientProvider client={crearQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function respuestaJson(datos: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(datos), { status }))
}

describe('navegación de la app', () => {
  it('muestra la barra inferior con las cinco secciones', () => {
    vi.stubGlobal('fetch', vi.fn(() => respuestaJson({ status: 'ok' })))
    renderEn('/')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    const enlaces = within(nav).getAllByRole('link')
    expect(enlaces.map((a) => a.textContent)).toEqual([
      'Inicio',
      'Rutina',
      'Entrenar',
      'Reservas',
      'Perfil',
    ])
  })

  it('abre la pantalla de entrenar desde la barra inferior', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuestaJson({ status: 'ok' })))
    const router = renderEn('/')
    await userEvent.click(screen.getByRole('link', { name: 'Entrenar' }))
    expect(router.state.location.pathname).toBe('/entrenar')
    expect(screen.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeInTheDocument()
  })

  it('llega a la cancha desde reservas y vuelve', async () => {
    const router = renderEn('/reservas')
    await userEvent.click(screen.getByRole('link', { name: /Cancha sintética/ }))
    expect(router.state.location.pathname).toBe('/reservas/cancha')
    await userEvent.click(screen.getByRole('link', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/reservas')
  })

  it('muestra un mensaje claro para rutas que no existen', () => {
    renderEn('/no-existe')
    expect(screen.getByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  })

  it('el login queda fuera del layout con navegación', () => {
    renderEn('/login')
    expect(screen.getByRole('heading', { name: 'GymTrack UNAL' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
  })
})

describe('estado del servidor en inicio', () => {
  it('indica que está conectado cuando el API responde ok', async () => {
    const fetchMock = vi.fn(() => respuestaJson({ status: 'ok', database: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    renderEn('/')
    expect(await screen.findByText('Conectado al servidor')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/health', expect.anything())
  })

  it('avisa cuando no hay conexión con el API', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderEn('/')
    expect(await screen.findByText(/Sin conexión con el servidor/)).toBeInTheDocument()
  })
})
