import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIL_INSTRUCTOR, renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion('instructor@gymtrack.test')
})

const cuerpoPost = (fetchMock: ReturnType<typeof simularApi>) => {
  const llamada = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/evaluaciones') && init?.method === 'POST')
  return llamada ? JSON.parse(String(llamada[1]?.body)) : undefined
}

async function llenarBasicos(peso: string, talla: string) {
  await userEvent.type(await screen.findByLabelText('Peso'), peso)
  await userEvent.type(screen.getByLabelText('Talla'), talla)
}

describe('registro de evaluación (GYMM-13)', () => {
  it('un deportista no puede entrar a las evaluaciones', async () => {
    supabaseFalso.actual!.conSesion()
    simularApi()
    renderApp('/evaluaciones')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
  })

  it('el instructor ve el acceso en Inicio, busca al deportista y ve su historial', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: /Evaluaciones/ }))
    await userEvent.type(screen.getByLabelText('Buscar deportista'), 'santiago')
    await waitFor(() => expect(within(screen.getByRole('list', { name: 'Deportistas' })).getAllByRole('listitem')).toHaveLength(1))
    await userEvent.clear(screen.getByLabelText('Buscar deportista'))
    await userEvent.click(await screen.findByRole('link', { name: /Daniela Deportista Prueba/ }))
    expect(router.state.location.pathname).toBe('/evaluaciones/d1')
    const historial = await screen.findByRole('list', { name: 'Evaluaciones' })
    expect(within(historial).getByRole('heading', { name: /Evaluación inicial, 22 de septiembre de 2026/ })).toBeInTheDocument()
    expect(within(historial).getByText('Cintura')).toBeInTheDocument()
  })

  it('valida rangos antes de enviar, junto a cada campo', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/evaluaciones/d1/nueva')
    await llenarBasicos('500', '1,70')
    expect(screen.queryByText(/IMC/)).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Cintura'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar evaluación' }))

    expect(screen.getByText('El peso debe estar entre 20 y 350 kg.')).toBeInTheDocument()
    expect(screen.getByText('La talla debe estar entre 100 y 250 cm.')).toBeInTheDocument()
    expect(screen.getByText('Cintura debe estar entre 10 y 250 cm.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa los 3 campos marcados.')
    // El foco queda en el primer campo con error, para corregirlo de inmediato.
    expect(screen.getByLabelText('Peso')).toHaveFocus()
    expect(cuerpoPost(fetchMock)).toBeUndefined()
  })

  it('guarda una evaluación nueva con solo las medidas llenas y la suma al historial', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/evaluaciones/d1/nueva')
    await llenarBasicos('61,8', '165')
    expect(await screen.findByText('22,7')).toBeInTheDocument() // IMC en vivo
    await userEvent.type(screen.getByLabelText('Porcentaje de grasa (opcional)'), '23,9')
    await userEvent.type(screen.getByLabelText('Cintura'), '71')
    await userEvent.type(screen.getByLabelText('Flexiones en 1 minuto'), '21')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar evaluación' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/evaluaciones/d1'))
    expect(await screen.findByText('Evaluación guardada.')).toBeInTheDocument()
    expect(cuerpoPost(fetchMock)).toEqual({
      pesoKg: 61.8,
      tallaCm: 165,
      porcentajeGrasa: 23.9,
      nivelActividad: null,
      observaciones: null,
      medidas: [
        { tipo: 'PERIMETRO', nombre: 'Cintura', valor: 71, unidad: 'cm' },
        { tipo: 'TEST_FISICO', nombre: 'Flexiones en 1 minuto', valor: 21, unidad: 'rep' },
      ],
    })
    // La anterior sigue ahí: ahora hay dos evaluaciones.
    const historial = await screen.findByRole('list', { name: 'Evaluaciones' })
    await waitFor(() => expect(within(historial).getAllByRole('listitem')).toHaveLength(2))
    expect(within(historial).getByRole('heading', { name: /Evaluación inicial/ })).toBeInTheDocument()
  })

  it('muestra junto a la medida correcta el error que devuelve el API', async () => {
    simularApi({
      perfil: PERFIL_INSTRUCTOR,
      respuestaPostEvaluacion: () =>
        new Response(
          JSON.stringify({ message: 'x', errores: { 'medidas.1.valor': 'Salto horizontal debe estar entre 0 y 400 cm.' } }),
          { status: 400 },
        ),
    })
    renderApp('/evaluaciones/d1/nueva')
    await llenarBasicos('62', '165')
    await userEvent.type(screen.getByLabelText('Cintura'), '70')
    await userEvent.type(screen.getByLabelText('Salto horizontal'), '300')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar evaluación' }))
    expect(await screen.findByText('Salto horizontal debe estar entre 0 y 400 cm.')).toBeInTheDocument()
    expect(screen.getByLabelText('Salto horizontal')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Cintura')).not.toHaveAttribute('aria-invalid')
  })
})
