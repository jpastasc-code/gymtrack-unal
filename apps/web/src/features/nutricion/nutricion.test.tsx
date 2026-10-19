import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'
import type { MiRequerimiento } from './api'

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

const REQUERIMIENTO: MiRequerimiento = {
  formula: 'KATCH_MCARDLE',
  tmb: 1389,
  factorActividad: 1.55,
  gastoDiario: 2153,
  ajusteObjetivo: 1.1,
  calorias: 2369,
  datos: {
    pesoKg: 62.5,
    tallaCm: 165,
    porcentajeGrasa: 24.5,
    edad: 23,
    sexo: 'FEMENINO',
    nivelActividad: 'MODERADO',
    objetivo: 'GANAR_MASA_MUSCULAR',
    fechaEvaluacion: '2026-09-22T15:00:00.000Z',
  },
}

/** Simula el API y responde GET /api/perfil/requerimiento-calorico con `respuesta`. */
function simularRequerimiento(respuesta: () => Response) {
  const fetchMock = simularApi()
  const normal = fetchMock.getMockImplementation()!
  fetchMock.mockImplementation(async (entrada, init) =>
    new URL(String(entrada)).pathname === '/api/perfil/requerimiento-calorico' ? respuesta() : normal(entrada, init),
  )
  return fetchMock
}

const json = (datos: unknown, status = 200) => new Response(JSON.stringify(datos), { status })

describe('requerimiento calórico (GYMM-25)', () => {
  it('muestra las calorías, cómo se calcularon y el aviso del profesional en nutrición', async () => {
    simularRequerimiento(() => json(REQUERIMIENTO))
    renderApp('/nutricion')

    const resultado = await screen.findByRole('region', { name: 'Tu requerimiento diario' })
    expect(within(resultado).getByText('2.369')).toBeInTheDocument()
    expect(within(resultado).getByText(/Objetivo: ganar masa muscular/)).toBeInTheDocument()

    const calculo = screen.getByRole('region', { name: 'Cómo se calcula' })
    expect(within(calculo).getByText('Fórmula de Katch-McArdle')).toBeInTheDocument()
    expect(within(calculo).getByText('Moderado: × 1,55')).toBeInTheDocument()
    expect(within(calculo).getByText('Ganar masa muscular: +10 %')).toBeInTheDocument()
    expect(within(calculo).getByText('2.153 kcal')).toBeInTheDocument()

    expect(screen.getByText(/no reemplaza la valoración de un profesional en nutrición/)).toBeInTheDocument()
  })

  it('con Mifflin-St Jeor explica que medir el % de grasa lo hace más preciso', async () => {
    simularRequerimiento(() =>
      json({
        ...REQUERIMIENTO,
        formula: 'MIFFLIN_ST_JEOR',
        ajusteObjetivo: 0.8,
        datos: { ...REQUERIMIENTO.datos, porcentajeGrasa: null, objetivo: 'PERDER_GRASA' },
      }),
    )
    renderApp('/nutricion')

    expect(await screen.findByText('Fórmula de Mifflin-St Jeor')).toBeInTheDocument()
    expect(screen.getByText('Perder grasa: −20 %')).toBeInTheDocument()
    expect(screen.getByText(/Si el instructor te lo mide, el cálculo será más preciso/)).toBeInTheDocument()
  })

  it('si faltan datos del perfil, dice cuáles y lleva a completarlo', async () => {
    simularRequerimiento(() =>
      json(
        {
          statusCode: 422,
          message: 'Para calcular tu requerimiento calórico faltan tu sexo y tu objetivo.',
          faltantes: ['sexo', 'objetivo'],
        },
        422,
      ),
    )
    renderApp('/nutricion')

    const faltan = await screen.findByRole('region', { name: 'Faltan datos' })
    expect(within(faltan).getByText(/faltan tu sexo y tu objetivo/)).toBeInTheDocument()
    expect(within(faltan).getByRole('link', { name: 'Completar mi perfil' })).toHaveAttribute('href', '/perfil')
    expect(within(faltan).queryByText(/pide a un instructor/)).not.toBeInTheDocument()
  })

  it('si no tiene evaluación, le pide hacérsela con un instructor', async () => {
    simularRequerimiento(() =>
      json(
        { statusCode: 422, message: 'Para calcular tu requerimiento calórico faltan tu peso y tu talla.', faltantes: ['pesoKg', 'tallaCm'] },
        422,
      ),
    )
    renderApp('/nutricion')

    const faltan = await screen.findByRole('region', { name: 'Faltan datos' })
    expect(within(faltan).getByText(/pide a un instructor del gimnasio/)).toBeInTheDocument()
    expect(within(faltan).queryByRole('link', { name: 'Completar mi perfil' })).not.toBeInTheDocument()
  })

  it('si falla la carga, deja intentar de nuevo', async () => {
    let falla = true
    simularRequerimiento(() =>
      falla ? json({ message: 'No tienes permiso para ver esto.' }, 403) : json(REQUERIMIENTO),
    )
    renderApp('/nutricion')

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('No tienes permiso para ver esto.')
    falla = false
    await userEvent.click(within(aviso).getByRole('button', { name: 'Intentar de nuevo' }))
    expect(await screen.findByText('2.369')).toBeInTheDocument()
  })
})
