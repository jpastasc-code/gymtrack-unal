import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RUTINA_VIGENTE, renderApp, simularApi } from '../../test/renderApp'
import { crearSupabaseFalso } from '../../test/supabaseFalso'
import type { Rutina } from '../rutinas/api'
import type { PrecargaEjercicio, Sesion } from './api'

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

/** Sentadilla (3 × 10-12) y remo en pirámide (2 × 12-10). */
const RUTINA: Rutina = {
  ...RUTINA_VIGENTE,
  dias: [
    {
      dia: 1,
      ejercicios: [
        RUTINA_VIGENTE.dias[0].ejercicios[0],
        {
          id: 're2',
          orden: 2,
          ejercicio: { id: 'e2', nombre: 'Remo con barra', grupoMuscular: 'ESPALDA' },
          series: 2,
          repeticionesObjetivo: '12-10',
          metodo: 'PIRAMIDE',
          descansoSegundos: null,
          notas: null,
        },
      ],
    },
  ],
}

const PRECARGA: PrecargaEjercicio[] = [
  {
    ejercicioId: 'e3',
    fecha: '2026-10-28T13:00:00.000Z',
    series: [
      { numeroSerie: 1, cargaKg: 40, repeticiones: 12 },
      { numeroSerie: 2, cargaKg: 40, repeticiones: 10 },
      { numeroSerie: 3, cargaKg: 40, repeticiones: 9 },
    ],
  },
]

const SESION: Sesion = { id: 's1', rutinaId: 'r1', inicio: '2026-11-04T13:00:00.000Z', fin: null, series: [] }

/** Cuerpos enviados a PUT /api/sesiones/:id/series. */
const seriesEnviadas = (fetchMock: ReturnType<typeof simularApi>) =>
  fetchMock.mock.calls
    .filter(([url, init]) => String(url).endsWith('/series') && init?.method === 'PUT')
    .map(([, init]) => JSON.parse(String(init!.body)) as object)

const fila = (numero: number) => screen.getByText(`Serie ${numero}`).closest('li')!

describe('registro rápido de series (GYMM-26)', () => {
  it('sin rutina explica cómo conseguirla', async () => {
    simularApi({ miRutina: null })
    renderApp('/entrenar')
    expect(await screen.findByText('Aún no tienes una rutina asignada.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Empezar a entrenar' })).not.toBeInTheDocument()
  })

  it('empieza la sesión y registra cada serie con un toque usando la carga de la última vez', async () => {
    const fetchMock = simularApi({ miRutina: RUTINA, precargaSesiones: PRECARGA })
    renderApp('/entrenar')

    await userEvent.click(await screen.findByRole('button', { name: 'Empezar a entrenar' }))
    expect(await screen.findByRole('heading', { name: 'Sentadilla con barra' })).toBeInTheDocument()
    expect(screen.getByText('0 de 5 series')).toBeInTheDocument()
    expect(screen.getByText('La última vez: 40 kg × 12 · 40 kg × 10 · 40 kg × 9')).toBeInTheDocument()
    expect(screen.getByLabelText('Carga')).toHaveValue('40')
    expect(screen.getByLabelText('Repeticiones')).toHaveValue('12')

    // Un solo toque registra la serie tal como la precargó.
    await userEvent.click(screen.getByRole('button', { name: 'Registrar serie 1' }))
    expect(await within(fila(1)).findByText('Registrada')).toBeInTheDocument()
    expect(fila(1)).toHaveTextContent('40 kg × 12')
    expect(screen.getByText('1 de 5 series')).toBeInTheDocument()

    // La siguiente se ajusta con los botones grandes.
    expect(screen.getByLabelText('Repeticiones')).toHaveValue('10')
    await userEvent.click(screen.getByRole('button', { name: 'Subir carga' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bajar repeticiones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar serie 2' }))
    expect(await within(fila(2)).findByText('Registrada')).toBeInTheDocument()

    expect(seriesEnviadas(fetchMock)).toEqual([
      { ejercicioId: 'e3', numeroSerie: 1, cargaKg: 40, repeticiones: 12 },
      { ejercicioId: 'e3', numeroSerie: 2, cargaKg: 42.5, repeticiones: 9 },
    ])
  })

  it('pasa al siguiente ejercicio, que sin historial trae las repeticiones de la rutina', async () => {
    simularApi({
      miRutina: RUTINA,
      sesionActual: {
        ...SESION,
        series: [1, 2].map((n) => ({ ejercicioId: 'e3', numeroSerie: n, cargaKg: 40, repeticiones: 10, registradaEn: SESION.inicio })),
      },
    })
    renderApp('/entrenar')

    // Sin historial, la serie 3 repite la serie anterior de hoy.
    expect(await screen.findByLabelText('Repeticiones')).toHaveValue('10')
    expect(screen.queryByRole('button', { name: 'Siguiente ejercicio' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar serie 3' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Siguiente ejercicio' }))
    expect(screen.getByRole('heading', { name: 'Remo con barra' })).toBeInTheDocument()
    expect(screen.getByText('Ejercicio 2 de 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Carga')).toHaveValue('0')
    expect(screen.getByLabelText('Repeticiones')).toHaveValue('12')
  })

  it('sin señal guarda la serie en el celular y la envía sola al volver la conexión', async () => {
    const red = { caida: true }
    const fetchMock = simularApi({ miRutina: RUTINA, sesionActual: SESION, precargaSesiones: PRECARGA, red })
    renderApp('/entrenar')

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar serie 1' }))
    expect(await screen.findByText('Sin conexión con el servidor.')).toBeInTheDocument()
    expect(fila(1)).toHaveTextContent('Sin enviar')
    // La serie cuenta en el progreso y la siguiente ya está lista.
    expect(screen.getByText('1 de 5 series')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar serie 2' })).toBeInTheDocument()
    expect(localStorage.getItem('gymtrack:entrenar:pendientes')).toContain('"numeroSerie":1')

    red.caida = false
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(await within(fila(1)).findByText('Registrada')).toBeInTheDocument()
    expect(screen.queryByText('Sin conexión con el servidor.')).not.toBeInTheDocument()
    expect(localStorage.getItem('gymtrack:entrenar:pendientes')).toBeNull()
    expect(seriesEnviadas(fetchMock).at(-1)).toEqual({ ejercicioId: 'e3', numeroSerie: 1, cargaKg: 40, repeticiones: 12 })
  })

  it('al volver a abrir la app envía las series que quedaron guardadas', async () => {
    localStorage.setItem(
      'gymtrack:entrenar:pendientes',
      JSON.stringify([{ sesionId: 's1', ejercicioId: 'e3', numeroSerie: 1, cargaKg: 45, repeticiones: 8 }]),
    )
    const fetchMock = simularApi({ miRutina: RUTINA, sesionActual: SESION })
    renderApp('/entrenar')

    await screen.findByText('Serie 1')
    expect(await within(fila(1)).findByText('Registrada')).toBeInTheDocument()
    expect(fila(1)).toHaveTextContent('45 kg × 8')
    expect(seriesEnviadas(fetchMock)).toEqual([{ ejercicioId: 'e3', numeroSerie: 1, cargaKg: 45, repeticiones: 8 }])
  })

  it('corrige una serie ya registrada', async () => {
    const fetchMock = simularApi({
      miRutina: RUTINA,
      sesionActual: { ...SESION, series: [{ ejercicioId: 'e3', numeroSerie: 1, cargaKg: 40, repeticiones: 12, registradaEn: SESION.inicio }] },
    })
    renderApp('/entrenar')

    await userEvent.click(await screen.findByRole('button', { name: 'Corregir serie 1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Bajar repeticiones' }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar serie 1' }))
    expect(await within(fila(1)).findByText('40 kg × 11')).toBeInTheDocument()
    expect(seriesEnviadas(fetchMock)).toEqual([{ ejercicioId: 'e3', numeroSerie: 1, cargaKg: 40, repeticiones: 11 }])
  })

  it('avisa si faltan series antes de terminar la sesión', async () => {
    simularApi({
      miRutina: RUTINA,
      sesionActual: { ...SESION, series: [{ ejercicioId: 'e3', numeroSerie: 1, cargaKg: 40, repeticiones: 12, registradaEn: SESION.inicio }] },
    })
    renderApp('/entrenar')

    await userEvent.click(await screen.findByRole('button', { name: 'Terminar sesión' }))
    expect(screen.getByText('Te faltan 4 series. ¿Terminar de todos modos?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, terminar sesión' }))

    expect(await screen.findByText('¡Sesión terminada! Registraste 1 serie.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Empezar a entrenar' })).toBeInTheDocument()
  })

  it('si no carga, explica el problema y deja reintentar', async () => {
    // Un 4xx no se reintenta solo, así la prueba no espera los reintentos.
    simularApi({ miRutina: 403 })
    renderApp('/entrenar')
    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor tuvo un problema. Intenta de nuevo.')
    expect(screen.getByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument()
  })
})
