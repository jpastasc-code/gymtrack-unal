import { describe, expect, it } from 'vitest'
import {
  AJUSTE_OBJETIVO,
  calcularRequerimientoCalorico,
  datosFaltantes,
  distribuirMacronutrientes,
  FACTOR_ACTIVIDAD,
  PROTEINA_G_POR_KG,
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

describe('distribuirMacronutrientes', () => {
  it('da los valores del ejemplo de DT-07 (125 g de proteína, 66 g de grasas y 319 g de carbohidratos)', () => {
    expect(distribuirMacronutrientes(2369, 62.5, 'GANAR_MASA_MUSCULAR')).toEqual({
      proteina: { gramos: 125, porcentaje: 21 },
      grasas: { gramos: 66, porcentaje: 25 },
      carbohidratos: { gramos: 319, porcentaje: 54 },
    })
  })

  it('usa la proteína por kilo de cada objetivo', () => {
    expect(PROTEINA_G_POR_KG).toEqual({ MANTENER: 1.6, GANAR_MASA_MUSCULAR: 2.0, PERDER_GRASA: 2.2 })
    expect(distribuirMacronutrientes(2000, 70, 'MANTENER').proteina.gramos).toBe(112)
    expect(distribuirMacronutrientes(2000, 70, 'PERDER_GRASA').proteina.gramos).toBe(154)
  })

  it('las grasas son siempre el 25 % de las calorías', () => {
    // 1.800 × 0,25 / 9 = 50 g
    expect(distribuirMacronutrientes(1800, 60, 'PERDER_GRASA').grasas).toEqual({ gramos: 50, porcentaje: 25 })
  })

  it('los porcentajes suman 100', () => {
    for (const objetivo of ['MANTENER', 'GANAR_MASA_MUSCULAR', 'PERDER_GRASA'] as const) {
      const d = distribuirMacronutrientes(2153, 63.7, objetivo)
      expect(d.proteina.porcentaje + d.grasas.porcentaje + d.carbohidratos.porcentaje).toBe(100)
    }
  })

  it('si la proteína y las grasas no dejan calorías, los carbohidratos quedan en 0', () => {
    // 120 kg × 2,2 = 264 g = 1.056 kcal; con 1.200 kcal y 300 de grasas no queda nada.
    expect(distribuirMacronutrientes(1200, 120, 'PERDER_GRASA').carbohidratos).toEqual({ gramos: 0, porcentaje: 0 })
  })

  it('rechaza calorías o peso imposibles', () => {
    expect(() => distribuirMacronutrientes(0, 60, 'MANTENER')).toThrow(RangeError)
    expect(() => distribuirMacronutrientes(2000, -1, 'MANTENER')).toThrow(RangeError)
  })
})
