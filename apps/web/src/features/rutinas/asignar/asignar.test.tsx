import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PERFIL_INSTRUCTOR, RUTINA_VIGENTE, renderApp, simularApi } from '../../../test/renderApp'
import { crearSupabaseFalso } from '../../../test/supabaseFalso'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion('instructor@gymtrack.test')
})

const cuerpoPost = (fetchMock: ReturnType<typeof simularApi>) => {
  const llamada = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/rutinas') && init?.method === 'POST')
  return llamada ? JSON.parse(String(llamada[1]?.body)) : undefined
}

/** Abre el buscador del día y agrega los ejercicios por nombre. */
async function agregarAlDia(dia: number, ...nombres: string[]) {
  const abrir = screen.queryByRole('button', { name: `Agregar ejercicio al día ${dia}` })
  if (abrir) await userEvent.click(abrir)
  const panel = screen.getByRole('group', { name: `Agregar ejercicios al día ${dia}` })
  for (const nombre of nombres) {
    await userEvent.click(await within(panel).findByRole('button', { name: `Agregar ${nombre}` }))
  }
  await userEvent.click(within(panel).getByRole('button', { name: 'Listo' }))
}

describe('armar y asignar una rutina (GYMM-21)', () => {
  it('un deportista no puede entrar a asignar rutinas', async () => {
    supabaseFalso.actual!.conSesion()
    simularApi()
    renderApp('/rutinas/d1/nueva')
    expect(await screen.findByRole('heading', { name: 'No tienes permiso para ver esta pantalla' })).toBeInTheDocument()
  })

  it('el instructor arma la rutina por días, en orden, y se la asigna al deportista', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_INSTRUCTOR })
    const router = renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: /Rutinas/ }))
    await userEvent.click(await screen.findByRole('link', { name: /Daniela Deportista Prueba/ }))
    expect(await screen.findByText(/No tiene una rutina vigente/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Asignar rutina' }))

    await userEvent.type(await screen.findByLabelText('Nombre de la rutina'), 'Fase 1 – 2 días')
    await agregarAlDia(1, 'Sentadilla con barra', 'Jalón al pecho en polea')
    // El segundo ejercicio va primero.
    await userEvent.click(screen.getByRole('button', { name: 'Subir Jalón al pecho en polea' }))
    expect(
      within(screen.getByRole('list', { name: 'Ejercicios del día 1' }))
        .getAllByRole('listitem')
        .map((li) => li.querySelector('p')?.textContent),
    ).toEqual(['Jalón al pecho en polea', 'Sentadilla con barra'])

    await userEvent.click(screen.getByRole('button', { name: 'Agregar día 2' }))
    await agregarAlDia(2, 'Remo con barra')
    const series = screen.getByLabelText('Series de Remo con barra, día 2')
    await userEvent.clear(series)
    await userEvent.type(series, '4')
    await userEvent.clear(screen.getByLabelText('Repeticiones de Remo con barra, día 2'))
    await userEvent.type(screen.getByLabelText('Repeticiones de Remo con barra, día 2'), '12-10-8-6')
    await userEvent.selectOptions(screen.getByLabelText('Método de Remo con barra, día 2'), 'PIRAMIDE')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar rutina' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/rutinas/d1'))
    expect(cuerpoPost(fetchMock)).toEqual({
      nombre: 'Fase 1 – 2 días',
      descripcion: null,
      ejercicios: [
        { ejercicioId: 'e1', dia: 1, series: 3, repeticionesObjetivo: '10-12', metodo: 'TRADICIONAL', descansoSegundos: null },
        { ejercicioId: 'e3', dia: 1, series: 3, repeticionesObjetivo: '10-12', metodo: 'TRADICIONAL', descansoSegundos: null },
        { ejercicioId: 'e2', dia: 2, series: 4, repeticionesObjetivo: '12-10-8-6', metodo: 'PIRAMIDE', descansoSegundos: null },
      ],
    })
    expect(await screen.findByText('Rutina asignada. Ya la puede ver en su celular.')).toBeInTheDocument()
    const dia2 = await screen.findByRole('region', { name: 'Día 2' })
    expect(within(dia2).getByText('Remo con barra')).toBeInTheDocument()
    expect(within(dia2).getByText('4 × 12-10-8-6')).toBeInTheDocument()
    // Flujo largo (dos días, varios campos): más tiempo que el límite por defecto de 5 s.
  }, 20_000)

  it('valida antes de enviar: nombre, días vacíos y series fuera de rango', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/rutinas/d1/nueva')
    await screen.findByLabelText('Nombre de la rutina')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar rutina' }))
    expect(screen.getByText('Escribe un nombre de al menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Agrega al menos un ejercicio al día 1 o quítalo.')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Nombre de la rutina'), 'Fase 1')
    await agregarAlDia(1, 'Remo con barra')
    await userEvent.clear(screen.getByLabelText('Series de Remo con barra, día 1'))
    await userEvent.type(screen.getByLabelText('Series de Remo con barra, día 1'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar rutina' }))
    expect(screen.getByText('Entre 1 y 20.')).toBeInTheDocument()
    expect(screen.getByLabelText('Series de Remo con barra, día 1')).toHaveFocus()
    expect(cuerpoPost(fetchMock)).toBeUndefined()
  })

  it('no deja agregar el mismo ejercicio dos veces al mismo día', async () => {
    simularApi({ perfil: PERFIL_INSTRUCTOR })
    renderApp('/rutinas/d1/nueva')
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar ejercicio al día 1' }))
    const panel = screen.getByRole('group', { name: 'Agregar ejercicios al día 1' })
    await userEvent.click(await within(panel).findByRole('button', { name: 'Agregar Remo con barra' }))
    expect(within(panel).getByRole('button', { name: 'Remo con barra ya está en el día 1' })).toBeDisabled()
  })

  it('con rutina vigente: avisa que deja de estar vigente, permite copiarla y la pasa a anteriores', async () => {
    const fetchMock = simularApi({ perfil: PERFIL_INSTRUCTOR, rutinas: { d1: [RUTINA_VIGENTE] } })
    const router = renderApp('/rutinas/d1')
    const vigente = await screen.findByRole('article', { name: 'Fase 1' })
    expect(within(vigente).getByText('3 × 10-12')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Asignar rutina nueva' }))
    expect(await screen.findByText(/«Fase 1» deja de estar vigente/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Copiar rutina vigente' }))
    expect(screen.getByLabelText('Series de Sentadilla con barra, día 1')).toHaveValue('3')
    expect(screen.getByLabelText('Indicaciones generales (opcional)')).toHaveValue('3 series de 10 a 12 repeticiones.')

    await userEvent.type(screen.getByLabelText('Nombre de la rutina'), 'Fase 2')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar rutina' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/rutinas/d1'))
    expect(cuerpoPost(fetchMock).ejercicios).toEqual([
      { ejercicioId: 'e3', dia: 1, series: 3, repeticionesObjetivo: '10-12', metodo: 'TRADICIONAL', descansoSegundos: 60 },
    ])
    expect(await screen.findByRole('article', { name: 'Fase 2' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Rutinas anteriores' })).getByText('Fase 1')).toBeInTheDocument()
  })

  it('muestra en el ejercicio el error que devuelve el API', async () => {
    simularApi({
      perfil: PERFIL_INSTRUCTOR,
      respuestaPostRutina: () =>
        new Response(
          JSON.stringify({
            message: '"Remo con barra" está desactivado en el catálogo.',
            errores: { 'ejercicios.0.ejercicioId': '"Remo con barra" está desactivado en el catálogo.' },
          }),
          { status: 400 },
        ),
    })
    renderApp('/rutinas/d1/nueva')
    await userEvent.type(await screen.findByLabelText('Nombre de la rutina'), 'Fase 1')
    await agregarAlDia(1, 'Remo con barra')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar rutina' }))
    const tarjeta = within(screen.getByRole('list', { name: 'Ejercicios del día 1' })).getByRole('listitem')
    expect(await within(tarjeta).findByText('"Remo con barra" está desactivado en el catálogo.')).toBeInTheDocument()
  })
})
