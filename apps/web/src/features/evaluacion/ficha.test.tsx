import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EVALUACION_INICIAL, renderApp, simularApi } from '../../test/renderApp'
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

describe('mi ficha física (GYMM-23)', () => {
  it('muestra la evaluación inicial y las posteriores, de la más reciente a la más antigua', async () => {
    const posterior = { ...EVALUACION_INICIAL, id: 'ev2', fecha: '2026-10-15T15:00:00.000Z', pesoKg: 60, medidas: [] }
    const fetchMock = simularApi({ miFicha: [posterior, EVALUACION_INICIAL] })
    renderApp('/ficha')

    const lista = await screen.findByRole('list', { name: 'Mis evaluaciones' })
    const titulos = within(lista).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titulos).toEqual(['Evaluación, 15 de octubre de 2026', 'Evaluación inicial, 22 de septiembre de 2026'])
    expect(within(lista).getByText('60 kg')).toBeInTheDocument()
    expect(within(lista).getByText('Cintura')).toBeInTheDocument()
    // Pide su propia ficha, sin enviar el id de nadie.
    expect(fetchMock.mock.calls.some(([url]) => new URL(String(url)).pathname === '/api/perfil/evaluaciones')).toBe(true)
  })

  it('si falla la carga, deja intentar de nuevo', async () => {
    const fetchMock = simularApi({ miFicha: [EVALUACION_INICIAL] })
    const normal = fetchMock.getMockImplementation()!
    let falla = true
    fetchMock.mockImplementation(async (entrada, init) =>
      falla && new URL(String(entrada)).pathname === '/api/perfil/evaluaciones'
        ? new Response(JSON.stringify({ message: 'No pudimos cargar tu ficha.' }), { status: 403 })
        : normal(entrada, init),
    )
    renderApp('/ficha')

    const aviso = await screen.findByRole('alert')
    falla = false
    await userEvent.click(within(aviso).getByRole('button', { name: 'Intentar de nuevo' }))
    expect(await screen.findByRole('list', { name: 'Mis evaluaciones' })).toBeInTheDocument()
  })

  it('explica qué hacer si aún no tiene evaluaciones', async () => {
    simularApi()
    renderApp('/ficha')
    expect(await screen.findByText(/Aún no tienes evaluaciones/)).toBeInTheDocument()
  })
})
