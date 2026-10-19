import { describe, expect, it } from 'vitest'
import {
  AJUSTE_OBJETIVO,
  calcularRequerimientoCalorico,
  datosFaltantes,
  FACTOR_ACTIVIDAD,
  tmbKatchMcArdle,
  tmbMifflinStJeor,
  type DatosRequerimiento,
} from './nutricion.js'

/** La deportista del seed y del ejemplo de DT-07. */
const DANIELA: DatosRequerimiento = {
  pesoKg: 62.5,
  tallaCm: 165,
  porcentajeGrasa: 24.5,
  edad: 23,
  sexo: 'FEMENINO',
  nivelActividad: 'MODERADO',
  objetivo: 'GANAR_MASA_MUSCULAR',
}

describe('tmbKatchMcArdle', () => {
  it('usa la masa magra: 370 + 21,6 × peso × (1 − %grasa / 100)', () => {
    // masa magra = 62,5 × 0,755 = 47,1875 kg
    expect(tmbKatchMcArdle(62.5, 24.5)).toBeCloseTo(1389.25, 5)
  })

  it('rechaza un peso o un % de grasa imposibles', () => {
    expect(() => tmbKatchMcArdle(0, 20)).toThrow(RangeError)
    expect(() => tmbKatchMcArdle(70, -1)).toThrow(RangeError)
    expect(() => tmbKatchMcArdle(70, 100)).toThrow(RangeError)
    expect(() => tmbKatchMcArdle(Number.NaN, 20)).toThrow(RangeError)
  })
})

describe('tmbMifflinStJeor', () => {
  it('suma 5 en hombres', () => {
    // 10 × 80 + 6,25 × 180 − 5 × 25 + 5
    expect(tmbMifflinStJeor(80, 180, 25, 'MASCULINO')).toBe(1805)
  })

  it('resta 161 en mujeres', () => {
    // 10 × 62,5 + 6,25 × 165 − 5 × 23 − 161
    expect(tmbMifflinStJeor(62.5, 165, 23, 'FEMENINO')).toBe(1380.25)
  })

  it('rechaza talla o edad imposibles', () => {
    expect(() => tmbMifflinStJeor(70, 0, 25, 'MASCULINO')).toThrow(RangeError)
    expect(() => tmbMifflinStJeor(70, 170, -3, 'FEMENINO')).toThrow(RangeError)
  })
})

describe('factores', () => {
  it('son los de la tabla de DT-07', () => {
    expect(FACTOR_ACTIVIDAD).toEqual({ SEDENTARIO: 1.2, LIGERO: 1.375, MODERADO: 1.55, ALTO: 1.725, MUY_ALTO: 1.9 })
    expect(AJUSTE_OBJETIVO).toEqual({ MANTENER: 1, GANAR_MASA_MUSCULAR: 1.1, PERDER_GRASA: 0.8 })
  })
})

describe('calcularRequerimientoCalorico', () => {
  it('con % de grasa usa Katch-McArdle (ejemplo de DT-07: ≈ 2.370 kcal)', () => {
    expect(calcularRequerimientoCalorico(DANIELA)).toEqual({
      formula: 'KATCH_MCARDLE',
      tmb: 1389,
      factorActividad: 1.55,
      gastoDiario: 2153,
      ajusteObjetivo: 1.1,
      calorias: 2369,
    })
  })

  it('sin % de grasa usa Mifflin-St Jeor', () => {
    const r = calcularRequerimientoCalorico({ ...DANIELA, porcentajeGrasa: null, objetivo: 'MANTENER' })
    expect(r.formula).toBe('MIFFLIN_ST_JEOR')
    expect(r.tmb).toBe(1380)
    // 1.380,25 × 1,55 = 2.139,39
    expect(r.calorias).toBe(2139)
  })

  it('perder grasa resta el 20 %', () => {
    const r = calcularRequerimientoCalorico({ ...DANIELA, objetivo: 'PERDER_GRASA', nivelActividad: 'SEDENTARIO' })
    // 1.389,25 × 1,2 × 0,8 = 1.333,68
    expect(r.gastoDiario).toBe(1667)
    expect(r.calorias).toBe(1334)
  })

  it('redondea solo al final', () => {
    // Redondeando en cada paso daría 1.389 × 1,55 × 1,1 = 2.368,2 → 2.368; sin redondear, 2.368,7 → 2.369.
    expect(calcularRequerimientoCalorico(DANIELA).calorias).toBe(2369)
  })

  it('si faltan datos lanza un error que dice cuáles', () => {
    expect(() => calcularRequerimientoCalorico({ ...DANIELA, objetivo: null })).toThrow(/objetivo/)
  })
})

describe('datosFaltantes', () => {
  it('no pide nada si están todos', () => {
    expect(datosFaltantes(DANIELA)).toEqual([])
  })

  it('con % de grasa no pide talla, edad ni sexo', () => {
    expect(datosFaltantes({ ...DANIELA, tallaCm: null, edad: null, sexo: null })).toEqual([])
  })

  it('sin % de grasa pide talla, edad y sexo', () => {
    const sinNada: DatosRequerimiento = {
      pesoKg: null,
      tallaCm: null,
      porcentajeGrasa: null,
      edad: null,
      sexo: null,
      nivelActividad: null,
      objetivo: null,
    }
    expect(datosFaltantes(sinNada)).toEqual(['pesoKg', 'tallaCm', 'edad', 'sexo', 'nivelActividad', 'objetivo'])
  })
})
