/**
 * Fórmulas nutricionales de GymTrack (DT-07 en docs/wiki/Decisiones-tecnicas.md).
 * Las usan el API (GYMM-25) y la web; no dependen de NestJS, React ni Prisma.
 */

export type Sexo = 'MASCULINO' | 'FEMENINO'
export type Objetivo = 'MANTENER' | 'GANAR_MASA_MUSCULAR' | 'PERDER_GRASA'
export type NivelActividad = 'SEDENTARIO' | 'LIGERO' | 'MODERADO' | 'ALTO' | 'MUY_ALTO'

/** Multiplica la tasa metabólica basal según el nivel de actividad. */
export const FACTOR_ACTIVIDAD: Record<NivelActividad, number> = {
  SEDENTARIO: 1.2,
  LIGERO: 1.375,
  MODERADO: 1.55,
  ALTO: 1.725,
  MUY_ALTO: 1.9,
}

/**
 * Ajuste de las calorías según el objetivo: mantener igual, +10 % para ganar masa muscular
 * y −20 % para perder grasa. Propuesta de DT-07, pendiente de validar con un profesional en nutrición.
 */
export const AJUSTE_OBJETIVO: Record<Objetivo, number> = {
  MANTENER: 1,
  GANAR_MASA_MUSCULAR: 1.1,
  PERDER_GRASA: 0.8,
}

export type FormulaTmb = 'KATCH_MCARDLE' | 'MIFFLIN_ST_JEOR'

/** Katch-McArdle: TMB = 370 + 21,6 × masa magra (kg). */
export function tmbKatchMcArdle(pesoKg: number, porcentajeGrasa: number): number {
  exigirPositivo('pesoKg', pesoKg)
  if (!Number.isFinite(porcentajeGrasa) || porcentajeGrasa < 0 || porcentajeGrasa >= 100) {
    throw new RangeError(`porcentajeGrasa debe estar entre 0 y 100; llegó ${porcentajeGrasa}.`)
  }
  const masaMagra = pesoKg * (1 - porcentajeGrasa / 100)
  return 370 + 21.6 * masaMagra
}

/** Mifflin-St Jeor: 10 × peso + 6,25 × talla − 5 × edad, +5 en hombres y −161 en mujeres. */
export function tmbMifflinStJeor(pesoKg: number, tallaCm: number, edad: number, sexo: Sexo): number {
  exigirPositivo('pesoKg', pesoKg)
  exigirPositivo('tallaCm', tallaCm)
  exigirPositivo('edad', edad)
  return 10 * pesoKg + 6.25 * tallaCm - 5 * edad + (sexo === 'MASCULINO' ? 5 : -161)
}

/** Datos de la persona para calcular el requerimiento. `null` es un dato que aún no tiene. */
export interface DatosRequerimiento {
  pesoKg: number | null
  tallaCm: number | null
  /** Si existe se usa Katch-McArdle; si no, Mifflin-St Jeor. */
  porcentajeGrasa: number | null
  /** Años cumplidos. Solo hace falta para Mifflin-St Jeor. */
  edad: number | null
  /** Solo hace falta para Mifflin-St Jeor. */
  sexo: Sexo | null
  nivelActividad: NivelActividad | null
  objetivo: Objetivo | null
}

export type DatoFaltante = 'pesoKg' | 'tallaCm' | 'edad' | 'sexo' | 'nivelActividad' | 'objetivo'

/**
 * Qué datos faltan para calcular el requerimiento. Con % de grasa no se piden talla, edad ni sexo,
 * porque Katch-McArdle no los usa: así no se le pide a nadie un dato que no cambia el resultado.
 */
export function datosFaltantes(datos: DatosRequerimiento): DatoFaltante[] {
  const faltan: DatoFaltante[] = []
  if (datos.pesoKg === null) faltan.push('pesoKg')
  if (datos.porcentajeGrasa === null) {
    if (datos.tallaCm === null) faltan.push('tallaCm')
    if (datos.edad === null) faltan.push('edad')
    if (datos.sexo === null) faltan.push('sexo')
  }
  if (datos.nivelActividad === null) faltan.push('nivelActividad')
  if (datos.objetivo === null) faltan.push('objetivo')
  return faltan
}

export interface RequerimientoCalorico {
  formula: FormulaTmb
  /** Tasa metabólica basal, en kcal/día. */
  tmb: number
  factorActividad: number
  /** TMB × factor de actividad: lo que gasta en un día, en kcal. */
  gastoDiario: number
  ajusteObjetivo: number
  /** Requerimiento diario según el objetivo, en kcal. */
  calorias: number
}

/**
 * Requerimiento calórico diario (GYMM-25). Las kcal se redondean al entero al final, para no
 * acumular el error de redondear en cada paso.
 * Lanza un `RangeError` si falta un dato (ver `datosFaltantes`) o si alguno está fuera de rango.
 */
export function calcularRequerimientoCalorico(datos: DatosRequerimiento): RequerimientoCalorico {
  const faltan = datosFaltantes(datos)
  if (faltan.length > 0) {
    throw new RangeError(`Faltan datos para calcular el requerimiento: ${faltan.join(', ')}.`)
  }
  // datosFaltantes ya garantizó que estos no son null.
  const pesoKg = datos.pesoKg!
  const nivelActividad = datos.nivelActividad!
  const objetivo = datos.objetivo!

  const formula: FormulaTmb = datos.porcentajeGrasa !== null ? 'KATCH_MCARDLE' : 'MIFFLIN_ST_JEOR'
  const tmb =
    formula === 'KATCH_MCARDLE'
      ? tmbKatchMcArdle(pesoKg, datos.porcentajeGrasa!)
      : tmbMifflinStJeor(pesoKg, datos.tallaCm!, datos.edad!, datos.sexo!)
  const factorActividad = FACTOR_ACTIVIDAD[nivelActividad]
  const ajusteObjetivo = AJUSTE_OBJETIVO[objetivo]

  return {
    formula,
    tmb: Math.round(tmb),
    factorActividad,
    gastoDiario: Math.round(tmb * factorActividad),
    ajusteObjetivo,
    calorias: Math.round(tmb * factorActividad * ajusteObjetivo),
  }
}

function exigirPositivo(nombre: string, valor: number): void {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new RangeError(`${nombre} debe ser un número mayor que 0; llegó ${valor}.`)
  }
}
