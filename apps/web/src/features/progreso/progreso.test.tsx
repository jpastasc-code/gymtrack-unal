import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'
import type { EjercicioConHistorico, HistoricoEjercicio } from './api'

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

const SENTADILLA = { id: 'e1', nombre: 'Sentadilla', grupoMuscular: 'CUADRICEPS' as const }
const LUNES = '2026-11-02T13:00:00.000Z'
const JUEVES = '2026-11-05T13:00:00.000Z'

const LISTA: EjercicioConHistorico[] = [
  { ejercicio: SENTADILLA, sesiones: 2, ultimaFecha: JUEVES, mejorMarca: { cargaKg: 50, repeticiones: 8, fecha: JUEVES } },
  {
    ejercicio: { id: 'e2', nombre: 'Flexiones', grupoMuscular: 'PECHO' },
    sesiones: 1,
    ultimaFecha: LUNES,
    mejorMarca: { cargaKg: 0, repeticiones: 20, fecha: LUNES },
  },
]

const HISTORICO: HistoricoEjercicio = {
  ejercicio: SENTADILLA,
  mejorMarca: { sesionId: 's2', numeroSerie: 1, cargaKg: 50, repeticiones: 8, fecha: JUEVES },
  sesiones: [
    {
      sesionId: 's2',
      fecha: JUEVES,
      series: [
        { numeroSerie: 1, cargaKg: 50, repeticiones: 8 },
        { numeroSerie: 2, cargaKg: 50, repeticiones: 6 },
      ],
    },
    { sesionId: 's1', fecha: LUNES, series: [{ numeroSerie: 1, cargaKg: 42.5, repeticiones: 12 }] },
  ],
}

const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status })

/** Simula el API y responde las rutas de /api/progreso con `respuestas`. */
function simularProgreso(respuestas: Record<string, () => Response>) {
  const fetchMock = simularApi()
  const normal = fetchMock.getMockImplementation()!
  fetchMock.mockImplementation(async (entrada, init) => {
    const respuesta = respuestas[new URL(String(entrada)).pathname]
    return respuesta ? respuesta() : normal(entrada, init)
  })
}

describe('histórico por ejercicio (GYMM-31)', () => {
  it('lista mis ejercicios con su mejor marca y abre el histórico de uno', async () => {
    simularProgreso({
      '/api/progreso/ejercicios': () => json(LISTA),
      '/api/progreso/ejercicios/e1': () => json(HISTORICO),
    })
    renderApp('/progreso')

    const lista = await screen.findByRole('list', { name: 'Ejercicios con histórico' })
    expect(within(lista).getByText('50 kg × 8')).toBeInTheDocument()
    // Sin carga, la marca son las repeticiones.
    expect(within(lista).getByText('20 repeticiones')).toBeInTheDocument()

    await userEvent.click(within(lista).getByRole('link', { name: /Sentadilla/ }))

    const marca = await screen.findByRole('region', { name: 'Tu mejor marca' })
    expect(marca).toHaveTextContent('50 kg × 8')
    expect(marca).toHaveTextContent('Serie 1 del 5 de noviembre de 2026')

    const sesiones = screen.getByRole('list', { name: 'Sesiones' })
    const dias = within(sesiones).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(dias).toEqual(['jueves, 5 de noviembre', 'lunes, 2 de noviembre'])
    expect(within(sesiones).getByText('42,5 kg × 12')).toBeInTheDocument()
    // La etiqueta va solo en la serie de la marca.
    expect(within(sesiones).getAllByText('Mejor marca')).toHaveLength(1)
  })

  it('si aún no he entrenado, lo explica y lleva a entrenar', async () => {
    simularProgreso({ '/api/progreso/ejercicios': () => json([]) })
    renderApp('/progreso')

    expect(await screen.findByText(/Aún no has registrado series/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a entrenar' })).toHaveAttribute('href', '/entrenar')
  })

  it('un ejercicio que aún no hice no tiene marca', async () => {
    simularProgreso({
      '/api/progreso/ejercicios/e1': () => json({ ejercicio: SENTADILLA, mejorMarca: null, sesiones: [] }),
    })
    renderApp('/progreso/ejercicios/e1')

    expect(await screen.findByText(/Aún no has registrado este ejercicio/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Tu mejor marca' })).not.toBeInTheDocument()
  })

  it('si falla la carga, deja intentar de nuevo', async () => {
    let falla = true
    simularProgreso({
      '/api/progreso/ejercicios': () => (falla ? json({ message: 'No tienes permiso para ver esto.' }, 403) : json(LISTA)),
    })
    renderApp('/progreso')

    const aviso = await screen.findByRole('alert')
    falla = false
    await userEvent.click(within(aviso).getByRole('button', { name: 'Intentar de nuevo' }))
    expect(await screen.findByRole('list', { name: 'Ejercicios con histórico' })).toBeInTheDocument()
  })
})
