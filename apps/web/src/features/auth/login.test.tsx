import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'
import { RutaProtegida } from './RutaProtegida'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

const falso = () => supabaseFalso.actual!

beforeEach(() => falso().reiniciar())

async function llenarLogin(correo: string, contrasena: string) {
  await userEvent.type(await screen.findByLabelText('Correo institucional'), correo)
  await userEvent.type(screen.getByLabelText('Contraseña'), contrasena)
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('inicio de sesión (GYMM-10)', () => {
  it('sin sesión, cualquier pantalla lleva al login', async () => {
    simularApi()
    const router = renderApp('/rutina')
    await screen.findByRole('heading', { name: 'GymTrack UNAL' })
    expect(router.state.location.pathname).toBe('/login')
  })

  it('con correo y contraseña correctos entra y vuelve a la pantalla que pidió', async () => {
    const fetchMock = simularApi()
    const router = renderApp('/rutina')
    await llenarLogin('Deportista@GymTrack.test ', 'clave-correcta')

    await waitFor(() => expect(router.state.location.pathname).toBe('/rutina'))
    expect(falso().auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'deportista@gymtrack.test',
      password: 'clave-correcta',
    })
    // El API recibe el token de Supabase en cada petición.
    await waitFor(() => {
      const llamadaPerfil = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/yo'))
      expect(new Headers(llamadaPerfil?.[1]?.headers).get('Authorization')).toBe(
        'Bearer token-de-deportista@gymtrack.test',
      )
    })
  })

  it('con contraseña incorrecta muestra un mensaje claro y no entra', async () => {
    simularApi()
    const router = renderApp('/login')
    await llenarLogin('deportista@gymtrack.test', 'otra')
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos')
    expect(router.state.location.pathname).toBe('/login')
  })

  it('pide los dos campos antes de enviar', async () => {
    simularApi()
    renderApp('/login')
    await userEvent.click(await screen.findByRole('button', { name: 'Iniciar sesión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe tu correo y tu contraseña.')
    expect(falso().auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('la sesión guardada se mantiene al volver a abrir la app', async () => {
    falso().conSesion()
    simularApi()
    const router = renderApp('/')
    await screen.findByRole('navigation', { name: 'Navegación principal' })
    expect(router.state.location.pathname).toBe('/')
    expect(falso().auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('cerrar sesión desde Perfil vuelve al login', async () => {
    falso().conSesion()
    simularApi()
    const router = renderApp('/perfil')
    expect(await screen.findByText('Daniela Deportista Prueba')).toBeInTheDocument()
    expect(screen.getByText('Deportista')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('una cuenta sin perfil en GymTrack ve el motivo y puede salir', async () => {
    falso().conSesion()
    simularApi({ perfil: 403 })
    renderApp('/')
    expect(await screen.findByRole('heading', { name: 'Tu cuenta no tiene acceso' })).toBeInTheDocument()
  })

  it('si el API rechaza el token (401), se cierra la sesión local', async () => {
    falso().conSesion()
    simularApi({ perfil: 401 })
    const router = renderApp('/')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(falso().auth.signOut).toHaveBeenCalled()
  })
})

describe('RutaProtegida con roles', () => {
  it('bloquea a un rol que no está permitido', async () => {
    const { rutas } = await import('../../app/rutas')
    rutas.push({
      path: '/solo-instructores',
      element: (
        <RutaProtegida roles={['INSTRUCTOR']}>
          <p>Contenido de instructores</p>
        </RutaProtegida>
      ),
    })
    falso().conSesion()
    simularApi()
    renderApp('/solo-instructores')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido de instructores')).not.toBeInTheDocument()
    rutas.pop()
  })
})
