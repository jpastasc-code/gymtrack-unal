import { describe, expect, it } from 'vitest'
import { mejorMarca, type SerieHecha } from './progreso.js'

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
