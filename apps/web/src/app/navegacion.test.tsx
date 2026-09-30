import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, simularApi } from '../test/renderApp'
import { crearSupabaseFalso } from '../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion()
})

describe('navegación de la app (con sesión iniciada)', () => {
  it('muestra la barra inferior con las cinco secciones', async () => {
    simularApi()
    renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Inicio',
      'Rutina',
      'Entrenar',
      'Reservas',
      'Perfil',
    ])
  })

  it('abre la pantalla de entrenar desde la barra inferior', async () => {
    simularApi()
    const router = renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Entrenar' }))
    expect(router.state.location.pathname).toBe('/entrenar')
    expect(screen.getByRole('heading', { level: 1, name: 'Entrenar' })).toBeInTheDocument()
  })

  it('llega a la cancha desde reservas y vuelve', async () => {
    simularApi()
    const router = renderApp('/reservas')
    await userEvent.click(await screen.findByRole('link', { name: /Cancha sintética/ }))
    expect(router.state.location.pathname).toBe('/reservas/cancha')
    await userEvent.click(screen.getByRole('link', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/reservas')
  })

  it('muestra un mensaje claro para rutas que no existen', async () => {
    simularApi()
    renderApp('/no-existe')
    expect(await screen.findByRole('heading', { name: 'Esta página no existe' })).toBeInTheDocument()
  })
})

describe('estado del servidor en inicio', () => {
  it('indica que está conectado cuando el API responde ok', async () => {
    const fetchMock = simularApi()
    renderApp('/')
    expect(await screen.findByText('Conectado al servidor')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/health', expect.anything())
  })

  it('avisa cuando no hay conexión con el API', async () => {
    simularApi({ saludOk: false })
    renderApp('/')
    await waitFor(() => expect(screen.getByText(/Sin conexión con el servidor/)).toBeInTheDocument())
  })
})
