import { describe, expect, it } from 'vitest'
import { evolucionPorSesion, mejorMarca, type SerieHecha } from './progreso.js'

const serie = (cargaKg: number, repeticiones: number, fecha: string): SerieHecha => ({ cargaKg, repeticiones, fecha })

describe('mejorMarca', () => {
  it('es la serie con más carga', () => {
    const series = [serie(40, 12, '2026-11-02'), serie(50, 8, '2026-11-05'), serie(45, 10, '2026-11-09')]
    expect(mejorMarca(series)).toEqual(serie(50, 8, '2026-11-05'))
  })

  it('con la misma carga gana la de más repeticiones', () => {
    const series = [serie(50, 6, '2026-11-02'), serie(50, 9, '2026-11-09'), serie(50, 8, '2026-11-05')]
    expect(mejorMarca(series)).toEqual(serie(50, 9, '2026-11-09'))
  })

  it('si empatan en todo, cuenta la primera vez que se logró', () => {
    const series = [serie(50, 8, '2026-11-09'), serie(50, 8, '2026-11-02')]
    expect(mejorMarca(series)?.fecha).toBe('2026-11-02')
  })

  it('en un ejercicio sin peso es el máximo de repeticiones', () => {
    const series = [serie(0, 15, '2026-11-02'), serie(0, 22, '2026-11-05')]
    expect(mejorMarca(series)).toEqual(serie(0, 22, '2026-11-05'))
  })

  it('conserva los demás datos de la serie', () => {
    const series = [{ ...serie(30, 10, '2026-11-02'), numeroSerie: 3 }]
    expect(mejorMarca(series)?.numeroSerie).toBe(3)
  })

  it('sin series no hay marca', () => {
    expect(mejorMarca([])).toBeNull()
  })
})

describe('evolucionPorSesion', () => {
  const series = (...pares: [number, number][]) => pares.map(([cargaKg, repeticiones]) => ({ cargaKg, repeticiones }))

  it('da la carga máxima y el volumen de cada sesión, de la más antigua a la más reciente', () => {
    const evolucion = evolucionPorSesion([
      { fecha: '2026-11-05T13:00:00.000Z', series: series([50, 8], [50, 6], [45, 10]) },
      { fecha: '2026-11-02T13:00:00.000Z', series: series([40, 12], [42.5, 10]) },
    ])
    expect(evolucion).toEqual([
      { fecha: '2026-11-02T13:00:00.000Z', cargaMaximaKg: 42.5, volumenKg: 905 },
      { fecha: '2026-11-05T13:00:00.000Z', cargaMaximaKg: 50, volumenKg: 1150 },
    ])
  })

  it('el volumen es series × repeticiones × carga cuando todas las series son iguales', () => {
    const [punto] = evolucionPorSesion([{ fecha: '2026-11-02', series: series([50, 10], [50, 10], [50, 10]) }])
    expect(punto.volumenKg).toBe(3 * 10 * 50)
  })

  it('redondea el volumen a un decimal', () => {
    const [punto] = evolucionPorSesion([{ fecha: '2026-11-02', series: series([0.1, 1], [0.2, 1]) }])
    expect(punto.volumenKg).toBe(0.3)
  })

  it('en un ejercicio sin peso la carga y el volumen son 0', () => {
    expect(evolucionPorSesion([{ fecha: '2026-11-02', series: series([0, 20]) }])).toEqual([
      { fecha: '2026-11-02', cargaMaximaKg: 0, volumenKg: 0 },
    ])
  })

  it('ignora las sesiones sin series y no falla sin sesiones', () => {
    expect(evolucionPorSesion([{ fecha: '2026-11-02', series: [] }])).toEqual([])
    expect(evolucionPorSesion([])).toEqual([])
  })
})
