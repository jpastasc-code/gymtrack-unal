import { describe, expect, it } from 'vitest'
import { describirSerie, repeticionesObjetivo, valoresIniciales, type Valores } from './valores'

const tradicional = { repeticionesObjetivo: '10-12', metodo: 'TRADICIONAL' as const }
const piramide = { repeticionesObjetivo: '12-10-8', metodo: 'PIRAMIDE' as const }

describe('repeticionesObjetivo', () => {
  it('toma el mínimo de un rango y las de cada serie en una pirámide', () => {
    expect(repeticionesObjetivo(tradicional, 1)).toBe(10)
    expect(repeticionesObjetivo(tradicional, 3)).toBe(10)
    expect([1, 2, 3, 4].map((n) => repeticionesObjetivo(piramide, n))).toEqual([12, 10, 8, 8])
    expect(repeticionesObjetivo({ repeticionesObjetivo: '15', metodo: 'CIRCUITO' }, 2)).toBe(15)
  })

  it('da 0 cuando el objetivo no son repeticiones', () => {
    expect(repeticionesObjetivo({ repeticionesObjetivo: '45 s', metodo: 'TRADICIONAL' }, 1)).toBe(0)
    expect(repeticionesObjetivo({ repeticionesObjetivo: 'al fallo', metodo: 'TRADICIONAL' }, 1)).toBe(0)
  })
})

describe('valoresIniciales', () => {
  const precarga = {
    ejercicioId: 'e1',
    fecha: '2026-10-28T13:00:00.000Z',
    series: [
      { numeroSerie: 1, cargaKg: 40, repeticiones: 12 },
      { numeroSerie: 2, cargaKg: 45, repeticiones: 10 },
    ],
  }
  const sinHoy = new Map<number, Valores>()

  it('repite la misma serie de la última sesión', () => {
    expect(valoresIniciales(piramide, 2, precarga, sinHoy)).toEqual({ cargaKg: 45, repeticiones: 10 })
  })

  it('si la última vez hizo menos series, sigue con la anterior de hoy o la última de entonces', () => {
    const hoy = new Map([[2, { cargaKg: 47.5, repeticiones: 9 }]])
    expect(valoresIniciales(piramide, 3, precarga, hoy)).toEqual({ cargaKg: 47.5, repeticiones: 9 })
    expect(valoresIniciales(piramide, 3, precarga, sinHoy)).toEqual({ cargaKg: 45, repeticiones: 10 })
  })

  it('sin historial usa las repeticiones de la rutina sin carga', () => {
    expect(valoresIniciales(piramide, 2, undefined, sinHoy)).toEqual({ cargaKg: 0, repeticiones: 10 })
  })

  it('describe la serie con coma decimal', () => {
    expect(describirSerie({ cargaKg: 42.5, repeticiones: 8 })).toBe('42,5 kg × 8')
  })
})
