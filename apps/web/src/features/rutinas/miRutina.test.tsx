import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RUTINA_VIGENTE, renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'
import type { EjercicioEnRutina, Rutina } from './api'

const supabaseFalso = vi.hoisted(() => ({ actual: null as ReturnType<typeof crearSupabaseFalso> | null }))
vi.mock('../../lib/supabase', async () => {
  const { crearSupabaseFalso } = await import('../../test/supabaseFalso')
  supabaseFalso.actual = crearSupabaseFalso()
  return { supabase: supabaseFalso.actual }
})

beforeEach(() => {
  supabaseFalso.actual!.reiniciar()
  supabaseFalso.actual!.conSesion()
  localStorage.clear()
})

const ejercicio = (id: string, nombre: string, extra: Partial<EjercicioEnRutina> = {}): EjercicioEnRutina => ({
  id,
  orden: 1,
  ejercicio: { id: `e-${id}`, nombre, grupoMuscular: 'ESPALDA' },
  series: 4,
  repeticionesObjetivo: '8-10',
  metodo: 'TRADICIONAL',
  descansoSegundos: null,
  notas: null,
  ...extra,
})

/** Rutina de dos días, como la ficha del gimnasio. */
const RUTINA_DOS_DIAS: Rutina = {
  ...RUTINA_VIGENTE,
  id: 'r2',
  nombre: 'Fuerza tren superior',
  descripcion: 'Descansa 90 s entre series pesadas.',
  dias: [
    {
      dia: 1,
      ejercicios: [
        ejercicio('a', 'Jalón al pecho en polea', { orden: 1 }),
        ejercicio('b', 'Remo con barra', { orden: 2, metodo: 'PIRAMIDE', repeticionesObjetivo: '12-10-8', notas: 'Sube la carga en cada serie.' }),
      ],
    },
    {
      dia: 2,
      ejercicios: [ejercicio('c', 'Sentadilla con barra', { series: 5, repeticionesObjetivo: '5', descansoSegundos: 120 })],
    },
  ],
}

/** Nombres de los ejercicios en el orden en que se ven. */
const ejerciciosEnPantalla = () =>
  screen
    .getAllByRole('listitem')
    .filter((li) => li.closest('ol'))
    .map((li) => li.querySelector('p')?.textContent)

describe('mi rutina vigente (GYMM-22)', () => {
  it('muestra la rutina con cada ejercicio en orden, series, repeticiones y método', async () => {
    simularApi({ miRutina: RUTINA_VIGENTE })
    renderApp('/rutina')

    expect(await screen.findByRole('heading', { name: 'Fase 1' })).toBeInTheDocument()
    expect(screen.getByText('3 series de 10 a 12 repeticiones.')).toBeInTheDocument()
    expect(screen.getByText(/Te la asignó Iván Instructor Prueba el 22 de septiembre de 2026/)).toBeInTheDocument()

    const fila = screen.getByText('Sentadilla con barra').closest('li')!
    // El método se muestra aunque sea el tradicional, y también el descanso.
    expect(fila).toHaveTextContent('Cuádriceps · Tradicional · descanso 60 s')
    expect(within(fila).getByText('(3 series de 10-12 repeticiones)')).toBeInTheDocument()
    // Con un solo día no hace falta elegir.
    expect(screen.queryByRole('group', { name: 'Día de la rutina' })).not.toBeInTheDocument()
  })

  it('reparte una rutina de varios días y recuerda el día elegido', async () => {
    simularApi({ miRutina: RUTINA_DOS_DIAS })
    renderApp('/rutina')

    expect(await screen.findByRole('button', { name: 'Día 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(ejerciciosEnPantalla()).toEqual(['Jalón al pecho en polea', 'Remo con barra'])
    const remo = screen.getByText('Remo con barra').closest('li')!
    expect(remo).toHaveTextContent('Espalda · Pirámide')
    expect(remo).toHaveTextContent('4 × 12-10-8')
    expect(remo).toHaveTextContent('Sube la carga en cada serie.')

    await userEvent.click(screen.getByRole('button', { name: 'Día 2' }))
    expect(screen.getByRole('button', { name: 'Día 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(ejerciciosEnPantalla()).toEqual(['Sentadilla con barra'])
    expect(screen.getByText('Sentadilla con barra').closest('li')).toHaveTextContent('5 × 5')
  })

  it('al volver a la pantalla sigue en el día que había elegido', async () => {
    localStorage.setItem('gymtrack:mi-rutina:r2:dia', '2')
    simularApi({ miRutina: RUTINA_DOS_DIAS })
    renderApp('/rutina')
    expect(await screen.findByRole('button', { name: 'Día 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(ejerciciosEnPantalla()).toEqual(['Sentadilla con barra'])
  })

  it('ignora un día guardado que la rutina ya no tiene', async () => {
    localStorage.setItem('gymtrack:mi-rutina:r2:dia', '5')
    simularApi({ miRutina: RUTINA_DOS_DIAS })
    renderApp('/rutina')
    expect(await screen.findByRole('button', { name: 'Día 1' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('explica qué hacer cuando aún no tiene una rutina asignada', async () => {
    simularApi({ miRutina: null })
    renderApp('/rutina')
    expect(await screen.findByText('Aún no tienes una rutina asignada.')).toBeInTheDocument()
    expect(screen.getByText(/Pídesela a tu instructor en el gimnasio/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra el error del servidor y deja intentar de nuevo', async () => {
    // Un 4xx se muestra enseguida; los 5xx se reintentan antes (ver app/query-client.ts).
    simularApi({ miRutina: 400 })
    renderApp('/rutina')
    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor tuvo un problema. Intenta de nuevo.')
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument()
  })
})
