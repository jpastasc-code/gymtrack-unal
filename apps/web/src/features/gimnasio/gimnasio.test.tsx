import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIL_DEPORTES, renderApp, simularApi } from '../../test/renderApp'
import { GIMNASIO_BASE } from '../../test/gimnasioFalso'
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

const franjas = () => within(screen.getByRole('list', { name: 'Franjas del día' }))

describe('reserva de cupo en el gimnasio (GYMM-27)', () => {
  it('llega desde Reservas y muestra los cupos de hoy, sin las franjas que ya pasaron', async () => {
    simularApi()
    const router = renderApp('/reservas')
    await userEvent.click(await screen.findByRole('link', { name: /Gimnasio/ }))
    expect(router.state.location.pathname).toBe('/reservas/gimnasio')

    expect(await screen.findByText('12 cupos libres de 30')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hoy', pressed: true })).toBeInTheDocument()
    expect(franjas().queryByText('06:00–07:00')).not.toBeInTheDocument()
    expect(screen.getByText('Aún no tienes cupos reservados.')).toBeInTheDocument()
    // Solo el personal de deportes configura los cupos.
    expect(screen.queryByRole('link', { name: 'Configurar cupos' })).not.toBeInTheDocument()
  })

  it('reserva el último cupo de una franja y lo cancela desde Mis reservas', async () => {
    simularApi()
    renderApp('/reservas/gimnasio')

    await userEvent.click(await screen.findByRole('button', { name: 'Mañana' }))
    expect(franjas().getByText('Sin cupos')).toBeInTheDocument()
    await userEvent.click(
      franjas().getByRole('button', { name: 'Reservar cupo el miércoles 11 de noviembre de 08:00 a 09:00' }),
    )

    expect(await screen.findByText('Listo, tienes cupo el miércoles 11 de noviembre de 08:00 a 09:00.')).toBeInTheDocument()
    expect(await franjas().findByText('Tu cupo')).toBeInTheDocument()
    const mias = await screen.findByRole('list', { name: 'Tus cupos reservados' })
    expect(mias).toHaveTextContent('Miércoles 11 de noviembre08:00–09:00')

    await userEvent.click(within(mias).getByRole('button', { name: /Cancelar tu cupo/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(
      await screen.findByText('Reserva cancelada: liberaste tu cupo del miércoles 11 de noviembre de 08:00 a 09:00.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('Aún no tienes cupos reservados.')).toBeInTheDocument()
    expect(await franjas().findByText('1 cupo libre de 20')).toBeInTheDocument()
    // El aviso de la reserva ya cancelada desaparece.
    expect(screen.queryByText(/Listo, tienes cupo/)).not.toBeInTheDocument()
  })

  it('si la franja se llenó mientras tanto, lo explica', async () => {
    const lleno = structuredClone(GIMNASIO_BASE)
    // La pantalla la ve con un cupo, pero el servidor ya no tiene ninguno.
    lleno.dias[0].franjas[1].libres = 0
    lleno.dias[0].franjas[1].estado = 'DISPONIBLE'
    simularApi({ gimnasio: lleno })
    renderApp('/reservas/gimnasio')

    await userEvent.click(await screen.findByRole('button', { name: /Reservar cupo el martes 10 de noviembre/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Esa franja se llenó. Elige otra hora.')
  })

  it('el personal de deportes cambia el cupo de una franja', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_DEPORTES })
    renderApp('/reservas/gimnasio')

    await userEvent.click(await screen.findByRole('link', { name: 'Configurar cupos' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Cupos del gimnasio' })).toBeInTheDocument()
    expect(screen.getByText('30 personas')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cambiar el cupo de 18:00 a 19:00' }))
    await userEvent.click(screen.getByRole('button', { name: 'Subir cupo de 18:00 a 19:00' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cupo' }))

    expect(await screen.findByText('Cupo del martes de 18:00 a 19:00: 35 personas.')).toBeInTheDocument()
    expect(await screen.findByText('35 personas')).toBeInTheDocument()
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ cupoMaximo: 35 })
  })

  it('si no cargan los cupos, explica el problema y deja reintentar', async () => {
    simularApi({ gimnasio: { ...GIMNASIO_BASE, error: 403 } })
    renderApp('/reservas/gimnasio')
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('El servidor tuvo un problema. Intenta de nuevo.')
    expect(within(alerta).getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument()
  })
})
