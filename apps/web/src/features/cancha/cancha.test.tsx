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
    .map((li) => li.textContent?.replace(/(\d{2}:\d{2})(Libre|Reservada|Tuya|Elegida|Ya pasó)$/, '$1 $2'))

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

describe('reserva de la cancha (GYMM-28)', () => {
  const MIERCOLES = 'Miércoles 21 de octubre'

  it('reserva una franja libre y la ve en sus reservas', async () => {
    const fetchMock = simularApi()
    renderApp('/reservas/cancha')
    expect(await screen.findByText('Aún no tienes reservas.')).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: 'Reservar miércoles 21 de octubre de 18:00 a 19:00' }))
    expect(franjasDe(MIERCOLES)).toEqual(['14:00–15:00 Ya pasó', '18:00–19:00 Elegida'])
    const confirmacion = screen.getByRole('alertdialog', { name: 'Confirmar reserva' })
    expect(confirmacion).toHaveTextContent('¿Reservar la cancha el miércoles 21 de octubre de 18:00 a 19:00?')
    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Sí, reservar' }))

    expect(await screen.findByText('Listo, la cancha es tuya el miércoles 21 de octubre de 18:00 a 19:00.')).toBeInTheDocument()
    await waitFor(() => expect(franjasDe(MIERCOLES)).toEqual(['14:00–15:00 Ya pasó', '18:00–19:00 Tuya']))
    const mias = await screen.findByRole('list', { name: 'Tus reservas activas' })
    expect(within(mias).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Miércoles 21 de octubre18:00–19:00Cancelar'])
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    const post = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/cancha/reservas') && init?.method === 'POST')
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ franjaId: 'f3', fecha: '2026-10-21' })
  })

  it('puede arrepentirse antes de confirmar', async () => {
    const fetchMock = simularApi()
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: 'Reservar sábado 24 de octubre de 08:00 a 09:00' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(franjasDe('Sábado 24 de octubre')).toEqual(['08:00–09:00 Libre'])
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('si otra persona la reservó primero, lo explica y la franja deja de verse libre', async () => {
    simularApi({ canchaGanadaPorOtro: ['2026-10-21 18:00'] })
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: 'Reservar miércoles 21 de octubre de 18:00 a 19:00' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, reservar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona acaba de reservar esa franja. Elige otra.')
    await waitFor(() => expect(franjasDe(MIERCOLES)).toEqual(['14:00–15:00 Ya pasó', '18:00–19:00 Reservada']))
    expect(screen.getByText('Aún no tienes reservas.')).toBeInTheDocument()
  })

  it('ve sus reservas activas en orden y marcadas como suyas en la semana', async () => {
    simularApi({ misReservasCancha: ['2026-10-28 14:00', '2026-10-24 08:00'] })
    renderApp('/reservas/cancha')

    const mias = await screen.findByRole('list', { name: 'Tus reservas activas' })
    expect(within(mias).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Sábado 24 de octubre08:00–09:00Cancelar',
      'Miércoles 28 de octubre14:00–15:00Cancelar',
    ])
    expect(franjasDe('Sábado 24 de octubre')).toEqual(['08:00–09:00 Tuya'])
    // Solo las franjas libres se pueden tocar.
    expect(screen.queryByRole('button', { name: /^Reservar sábado/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Reservar miércoles 21 de octubre de 14:00/ })).not.toBeInTheDocument()
  })

  it('si no carga sus reservas, lo dice y deja intentar de nuevo sin perder la semana', async () => {
    simularApi({ errorMisReservas: 403 })
    renderApp('/reservas/cancha')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar tus reservas.')
    expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Semana del 19 al 25 de octubre' })).toBeInTheDocument()
  })
})

describe('cancelación de reservas de la cancha (GYMM-29)', () => {
  const SABADO = 'Sábado 24 de octubre'

  it('cancela una reserva propia y la franja vuelve a verse libre de inmediato', async () => {
    simularApi({ misReservasCancha: ['2026-10-24 08:00'] })
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar tu reserva del sábado 24 de octubre de 08:00 a 09:00' }))
    const confirmacion = screen.getByRole('alertdialog', { name: 'Confirmar cancelación' })
    expect(confirmacion).toHaveTextContent('¿Cancelar tu reserva del sábado 24 de octubre de 08:00 a 09:00?')
    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Sí, cancelar' }))

    expect(await screen.findByText('Reserva cancelada: la franja del sábado 24 de octubre de 08:00 a 09:00 quedó libre.')).toBeInTheDocument()
    expect(await screen.findByText('Aún no tienes reservas.')).toBeInTheDocument()
    await waitFor(() => expect(franjasDe(SABADO)).toEqual(['08:00–09:00 Libre']))
  })

  it('puede arrepentirse y mantener la reserva', async () => {
    const fetchMock = simularApi({ misReservasCancha: ['2026-10-24 08:00'] })
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: /^Cancelar tu reserva del sábado/ }))
    await userEvent.click(screen.getByRole('button', { name: 'No, mantenerla' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(franjasDe(SABADO)).toEqual(['08:00–09:00 Tuya'])
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/cancelar'))).toBe(false)
  })

  it('un deportista no ve de quién es una franja reservada ni puede cancelarla', async () => {
    simularApi()
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: 'Semana siguiente' }))
    expect(await screen.findByRole('region', { name: 'Lunes 26 de octubre' })).toHaveTextContent('14:00–15:00Reservada')
    expect(screen.queryByRole('button', { name: /^Cancelar la reserva de/ })).not.toBeInTheDocument()
  })

  it('el personal de deportes ve a nombre de quién está la franja y cancela la reserva', async () => {
    supabaseFalso.actual!.conSesion('deportes@gymtrack.test')
    simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/reservas/cancha')
    await userEvent.click(await screen.findByRole('button', { name: 'Semana siguiente' }))

    const lunes = await screen.findByRole('region', { name: 'Lunes 26 de octubre' })
    expect(lunes).toHaveTextContent('14:00–15:00Otra Persona')
    await userEvent.click(within(lunes).getByRole('button', { name: 'Cancelar la reserva de Otra Persona, lunes 26 de octubre de 14:00 a 15:00' }))
    const confirmacion = within(lunes).getByRole('alertdialog', { name: 'Confirmar cancelación' })
    expect(confirmacion).toHaveTextContent('¿Cancelar la reserva de Otra Persona del lunes 26 de octubre de 14:00 a 15:00?')
    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Sí, cancelar la reserva' }))

    expect(
      await within(lunes).findByText('Reserva de Otra Persona cancelada: la franja del lunes 26 de octubre de 14:00 a 15:00 quedó libre.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(franjasDe('Lunes 26 de octubre')).toEqual(['14:00–15:00 Libre']))
  })
})
