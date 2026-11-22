import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIL_DEPORTES, PERFIL_INSTRUCTOR, renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

const falso = () => supabaseFalso.actual!

beforeEach(() => {
  falso().reiniciar()
  localStorage.clear()
})

async function iniciarSesion(correo: string) {
  await userEvent.type(await screen.findByLabelText('Correo institucional'), correo)
  await userEvent.type(screen.getByLabelText('Contraseña'), 'clave-correcta')
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

const textos = (elementos: HTMLElement[]) => elementos.map((e) => e.textContent)
const secciones = async () =>
  textos(within(await screen.findByRole('navigation', { name: 'Secciones del panel' })).getAllByRole('link'))
const pestanas = async () =>
  within(await screen.findByRole('navigation', { name: 'Navegación del panel' })).getAllByRole('link')

describe('panel del personal (GYMM-47)', () => {
  it('el deportista no ve ningún acceso al panel en Inicio', async () => {
    falso().conSesion()
    simularApi()
    renderApp('/')
    await screen.findByRole('navigation', { name: 'Más secciones' })
    expect(screen.queryByRole('link', { name: /Ir a mi panel/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Rutinas|Evaluaciones/ })).not.toBeInTheDocument()
  })

  it('a un deportista /panel le dice que no tiene permiso', async () => {
    falso().conSesion()
    simularApi()
    renderApp('/panel')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navegación del panel' })).not.toBeInTheDocument()
  })

  it('el instructor entra al panel tras iniciar sesión y ve las 5 secciones', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/login')
    await iniciarSesion('instructor@gymtrack.test')

    await waitFor(() => expect(router.state.location.pathname).toBe('/panel'))
    expect(await secciones()).toEqual([
      expect.stringMatching(/^Rutinas/),
      expect.stringMatching(/^Evaluaciones/),
      expect.stringMatching(/^Ejercicios/),
      expect.stringMatching(/^Cupos/),
      expect.stringMatching(/^Cancha/),
    ])
    // En la barra caben 5 pestañas en el celular: Cupos y Cancha solo aparecen desde 1024 px.
    const barra = await pestanas()
    expect(textos(barra)).toEqual(['Panel', 'Rutinas', 'Evaluaciones', 'Ejercicios', 'Cupos', 'Cancha', 'Perfil'])
    const enCelular = barra.filter((a) => !a.closest('li')!.className.includes('hidden'))
    expect(textos(enCelular)).toEqual(['Panel', 'Rutinas', 'Evaluaciones', 'Ejercicios', 'Perfil'])
  })

  it('el personal de deportes solo ve Cupos y Cancha', async () => {
    falso().conSesion('deportes@gymtrack.test')
    simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/panel')
    expect(await secciones()).toEqual([expect.stringMatching(/^Cupos/), expect.stringMatching(/^Cancha/)])
    expect(textos(await pestanas())).toEqual(['Panel', 'Cupos', 'Cancha', 'Perfil'])
  })

  it('el personal de deportes no entra a las secciones que no le tocan', async () => {
    falso().conSesion('deportes@gymtrack.test')
    simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/panel/rutinas')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
  })

  it('desde el panel se llega a Perfil y a cerrar sesión', async () => {
    falso().conSesion('instructor@gymtrack.test')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/panel')
    await userEvent.click((await pestanas()).find((a) => a.textContent === 'Perfil')!)
    expect(router.state.location.pathname).toBe('/panel/perfil')
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})

describe('cambio de modo (GYMM-47)', () => {
  it('pasa del panel al modo deportista y de vuelta, y lo recuerda', async () => {
    falso().conSesion('instructor@gymtrack.test')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/panel')

    const [entrenar] = await screen.findAllByRole('link', { name: 'Entrenar como deportista' })
    await userEvent.click(entrenar)
    expect(router.state.location.pathname).toBe('/')
    expect(localStorage.getItem('gymtrack:modo')).toBe('deportista')
    // El modo deportista no muestra accesos del personal, salvo el enlace a su panel.
    expect(await screen.findByRole('link', { name: /Ir a mi panel/ })).toHaveTextContent(
      'Rutinas, evaluaciones, ejercicios, cupos y cancha',
    )

    await userEvent.click(screen.getByRole('link', { name: /Ir a mi panel/ }))
    expect(router.state.location.pathname).toBe('/panel')
    expect(localStorage.getItem('gymtrack:modo')).toBe('panel')
  })

  it('al iniciar sesión abre el último modo guardado', async () => {
    localStorage.setItem('gymtrack:modo', 'deportista')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/login')
    await iniciarSesion('instructor@gymtrack.test')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('link', { name: /Ir a mi panel/ })).toBeInTheDocument()
  })

  it('al iniciar sesión respeta la pantalla que se había pedido', async () => {
    localStorage.setItem('gymtrack:modo', 'deportista')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/panel/cancha')
    await iniciarSesion('instructor@gymtrack.test')
    await waitFor(() => expect(router.state.location.pathname).toBe('/panel/cancha'))
  })

  it('el deportista entra a Inicio', async () => {
    simularApi()
    const router = renderApp('/login')
    await iniciarSesion('deportista@gymtrack.test')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('sin perfil (sin conexión), el instructor abre en modo deportista y el panel sigue bloqueado', async () => {
    falso().conSesion('instructor@gymtrack.test')
    simularApi({ perfil: PERFIL_INSTRUCTOR, perfilSinConexion: true })
    const router = renderApp('/login')
    // El perfil se reintenta dos veces antes de darse por perdido.
    await waitFor(() => expect(router.state.location.pathname).toBe('/'), { timeout: 8000 })
    expect(await screen.findByRole('heading', { name: 'Tu rutina de hoy' })).toBeInTheDocument()

    await router.navigate('/panel')
    expect(await screen.findByRole('heading', { name: 'No pudimos comprobar tus permisos' })).toBeInTheDocument()
  }, 15_000)
})

describe('rutas viejas del personal (GYMM-47)', () => {
  it.each([
    ['/rutinas', '/panel/rutinas'],
    ['/rutinas/d1/nueva', '/panel/rutinas/d1/nueva'],
    ['/evaluaciones/d1', '/panel/evaluaciones/d1'],
    ['/ejercicios/nuevo', '/panel/ejercicios/nuevo'],
    ['/ejercicios/e2/editar', '/panel/ejercicios/e2/editar'],
    ['/reservas/gimnasio/franjas', '/panel/gimnasio'],
    ['/reservas/cancha/franjas', '/panel/cancha'],
  ])('%s redirige a %s', async (vieja, nueva) => {
    falso().conSesion('instructor@gymtrack.test')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp(vieja)
    await waitFor(() => expect(router.state.location.pathname).toBe(nueva))
  })

  it('el catálogo del modo deportista es solo de lectura, también para el instructor', async () => {
    falso().conSesion('instructor@gymtrack.test')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/ejercicios')
    await screen.findByRole('list', { name: 'Ejercicios del catálogo' })
    expect(screen.queryByRole('link', { name: 'Agregar ejercicio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Editar / })).not.toBeInTheDocument()
  })
})

describe('modo deportista sin accesos del personal (GYMM-47)', () => {
  it('el instructor no ve los botones de franjas en las reservas', async () => {
    falso().conSesion('instructor@gymtrack.test')
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/reservas/gimnasio')
    expect(await screen.findByRole('heading', { level: 1, name: 'Gimnasio' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Configurar cupos' })).not.toBeInTheDocument()
  })

  it('el personal de deportes no ve "Definir franjas" en la cancha', async () => {
    falso().conSesion('deportes@gymtrack.test')
    simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/reservas/cancha')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cancha sintética' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Definir franjas' })).not.toBeInTheDocument()
  })
})
