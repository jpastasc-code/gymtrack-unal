import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIL_DEPORTES, renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion()
})

/** Franjas de un día tal como se leen: ["14:00–15:00 Ya pasó", …]. */
const franjasDe = (dia: string) =>
  within(screen.getByRole('region', { name: dia }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent?.replace(/(\d{2}:\d{2})(Libre|Reservada|Ya pasó)$/, '$1 $2'))

describe('disponibilidad de la cancha: deportista (GYMM-20)', () => {
  it('ve la semana actual con lo libre, lo que ya pasó y los días sin horario', async () => {
    simularApi()
    renderApp('/reservas/cancha')

    expect(await screen.findByRole('heading', { name: 'Semana del 19 al 25 de octubre' })).toBeInTheDocument()
    expect(screen.getByText('2 franjas libres esta semana')).toBeInTheDocument()
    // Un día que ya terminó se resume en una línea en vez de una tarjeta por franja.
    expect(franjasDe('Lunes 19 de octubre')).toEqual([])
    expect(within(screen.getByRole('region', { name: 'Lunes 19 de octubre' })).getByText('Ya pasaron todas las franjas de este día.')).toBeInTheDocument()
    expect(franjasDe('Miércoles 21 de octubre')).toEqual(['14:00–15:00 Ya pasó', '18:00–19:00 Libre'])
    expect(within(screen.getByRole('region', { name: 'Miércoles 21 de octubre' })).getByText('Hoy')).toBeInTheDocument()
    // La franja del jueves está deshabilitada: el deportista no la ve.
    expect(within(screen.getByRole('region', { name: 'Jueves 22 de octubre' })).getByText('Sin horario habilitado.')).toBeInTheDocument()
    expect(franjasDe('Sábado 24 de octubre')).toEqual(['08:00–09:00 Libre'])

    // No hay semanas anteriores que consultar, ni opciones de administración.
    expect(screen.getByRole('button', { name: 'Semana anterior' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Definir franjas' })).not.toBeInTheDocument()
  })

  it('pasa a la semana siguiente y ve las franjas reservadas', async () => {
    const fetchMock = simularApi()
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: 'Semana siguiente' }))

    expect(await screen.findByRole('heading', { name: 'Semana del 26 de octubre al 1 de noviembre' })).toBeInTheDocument()
    expect(franjasDe('Lunes 26 de octubre')).toEqual(['14:00–15:00 Reservada'])
    expect(franjasDe('Miércoles 28 de octubre')).toEqual(['14:00–15:00 Libre', '18:00–19:00 Libre'])
    expect(screen.getByText('3 franjas libres esta semana')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/cancha/disponibilidad?semana=2026-10-26'))).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Semana anterior' }))
    expect(await screen.findByRole('heading', { name: 'Semana del 19 al 25 de octubre' })).toBeInTheDocument()
  })

  it('explica cuando la cancha no tiene horarios habilitados', async () => {
    simularApi({ franjasCancha: [] })
    renderApp('/reservas/cancha')
    expect(await screen.findByText('La cancha no tiene horarios habilitados esta semana.')).toBeInTheDocument()
    expect(screen.getByText('Mira la semana siguiente o pregunta en el área de deportes.')).toBeInTheDocument()
  })

  it('muestra el error del servidor y deja intentar de nuevo', async () => {
    simularApi({ errorCancha: 404 })
    renderApp('/reservas/cancha')
    expect(await screen.findByRole('alert')).toHaveTextContent('La cancha no está habilitada en este momento.')
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument()
  })

  it('no puede abrir la pantalla de franjas', async () => {
    simularApi()
    renderApp('/reservas/cancha/franjas')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
  })
})

describe('franjas de la cancha: personal de deportes (GYMM-20)', () => {
  beforeEach(() => supabaseFalso.actual!.conSesion('deportes@gymtrack.test'))

  const escribirHora = (etiqueta: string, hora: string) => fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: hora } })

  it('habilita una franja nueva y la ve en la disponibilidad', async () => {
    simularApi({ perfil: PERFIL_DEPORTES })
    const router = renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('link', { name: 'Definir franjas' }))

    await userEvent.selectOptions(await screen.findByLabelText('Día'), '5')
    escribirHora('Desde', '16:00')
    escribirHora('Hasta', '17:00')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar franja' }))

    expect(await screen.findByText('Franja agregada: viernes de 16:00 a 17:00.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Franjas del viernes' })).getByText('16:00–17:00')).toBeInTheDocument()
    // Queda listo para encadenar la franja siguiente.
    expect(screen.getByLabelText('Desde')).toHaveValue('17:00')

    await userEvent.click(screen.getByRole('link', { name: 'Volver' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reservas/cancha'))
    expect(await screen.findByRole('region', { name: 'Viernes 23 de octubre' })).toHaveTextContent('16:00–17:00Libre')
  })

  it('valida las horas y muestra el cruce que responde el API', async () => {
    simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/reservas/cancha/franjas')
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar franja' }))
    expect(screen.getByText('Elige un día de la semana.')).toBeInTheDocument()
    expect(screen.getByText('Escribe la hora de inicio.')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Día'), '1')
    escribirHora('Desde', '15:00')
    escribirHora('Hasta', '14:00')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar franja' }))
    expect(screen.getByText('La hora de fin debe ser posterior a la de inicio.')).toBeInTheDocument()

    escribirHora('Desde', '14:30')
    escribirHora('Hasta', '15:30')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar franja' }))
    expect(await screen.findByText('Se cruza con la franja de 14:00 a 15:00.')).toBeInTheDocument()
  })

  it('deshabilita, habilita y elimina una franja (con confirmación)', async () => {
    simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/reservas/cancha/franjas')

    await userEvent.click(await screen.findByRole('button', { name: 'Deshabilitar miércoles de 18:00 a 19:00' }))
    expect(await screen.findByText('Franja deshabilitada: miércoles de 18:00 a 19:00.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Franjas del miércoles' })).getByText('Deshabilitada')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Habilitar jueves de 18:00 a 19:00' }))
    expect(await screen.findByText('Franja habilitada: jueves de 18:00 a 19:00.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar sábado de 08:00 a 09:00' }))
    const confirmacion = screen.getByRole('alertdialog')
    expect(confirmacion).toHaveTextContent('¿Eliminar la franja del sábado de 08:00 a 09:00?')
    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Sí, eliminar' }))
    expect(await screen.findByText('Franja eliminada: sábado de 08:00 a 09:00.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Franjas del sábado' })).not.toBeInTheDocument()
  })
})
