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
  macronutrientes: {
    proteina: { gramos: 125, porcentaje: 21 },
    grasas: { gramos: 66, porcentaje: 25 },
    carbohidratos: { gramos: 319, porcentaje: 54 },
  },
}

/** La misma deportista con objetivo perder grasa: −20 % y 2,2 g de proteína por kilo. */
const PERDER_GRASA: MiRequerimiento = {
  ...REQUERIMIENTO,
  ajusteObjetivo: 0.8,
  calorias: 1723,
  datos: { ...REQUERIMIENTO.datos, objetivo: 'PERDER_GRASA' },
  macronutrientes: {
    proteina: { gramos: 138, porcentaje: 32 },
    grasas: { gramos: 48, porcentaje: 25 },
    carbohidratos: { gramos: 155, porcentaje: 43 },
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

  it('reparte las calorías en macronutrientes (GYMM-30)', async () => {
    simularRequerimiento(() => json(REQUERIMIENTO))
    renderApp('/nutricion')

    const macros = await screen.findByRole('region', { name: 'Macronutrientes' })
    const proteina = within(macros).getByText('Proteína').parentElement!
    expect(proteina).toHaveTextContent('125 g')
    expect(proteina).toHaveTextContent('21 % de las calorías')
    expect(proteina).toHaveTextContent('2 g por kg de tu peso')
    expect(within(macros).getByText('Carbohidratos').parentElement!).toHaveTextContent('319 g')
    expect(within(macros).getByText('Grasas').parentElement!).toHaveTextContent('Siempre el 25 %, con cualquier objetivo')
  })

  it('al cambiar el objetivo en el perfil, los macronutrientes se recalculan', async () => {
    let actual = REQUERIMIENTO
    simularRequerimiento(() => json(actual))
    renderApp('/nutricion')
    const macros = await screen.findByRole('region', { name: 'Macronutrientes' })
    expect(within(macros).getByText('Proteína').parentElement!).toHaveTextContent('125 g')

    // El API recalcula con el objetivo nuevo; la web debe volver a pedirlo al guardar el perfil.
    actual = PERDER_GRASA
    await userEvent.click(screen.getByRole('link', { name: 'Cambiar mi objetivo o actividad' }))
    await userEvent.click(await screen.findByRole('radio', { name: /Perder grasa/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Cambios guardados.')

    await userEvent.click(screen.getAllByRole('link', { name: 'Inicio' })[0])
    await userEvent.click(await screen.findByRole('link', { name: /Nutrición/ }))
    const nuevos = await screen.findByRole('region', { name: 'Macronutrientes' })
    expect(await within(nuevos).findByText('138 g')).toBeInTheDocument()
  })
})

