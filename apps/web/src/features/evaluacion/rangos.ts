/**
 * Rangos razonables de cada medida (GYMM-13). Son los mismos del API
 * (apps/api/src/evaluaciones/rangos.ts) y de las restricciones CHECK de la base de datos:
 * si cambias uno, cambia los tres.
 */
export const RANGOS_BASICOS = {
  pesoKg: { min: 20, max: 350, unidad: 'kg', nombre: 'El peso' },
  tallaCm: { min: 100, max: 250, unidad: 'cm', nombre: 'La talla' },
  porcentajeGrasa: { min: 2, max: 70, unidad: '%', nombre: 'El porcentaje de grasa' },
} as const

export type TipoMedida = 'PERIMETRO' | 'PLIEGUE' | 'TEST_FISICO'

export const RANGOS_MEDIDA: Record<TipoMedida, Record<string, { min: number; max: number }>> = {
  PERIMETRO: { cm: { min: 10, max: 250 } },
  PLIEGUE: { mm: { min: 1, max: 80 } },
  TEST_FISICO: {
    rep: { min: 0, max: 500 },
    s: { min: 0, max: 7200 },
    cm: { min: 0, max: 400 },
    m: { min: 0, max: 5000 },
    kg: { min: 0, max: 500 },
  },
}

export interface MedidaPredefinida {
  tipo: TipoMedida
  nombre: string
  unidad: string
}

/** Medidas que ofrece el formulario; el instructor llena solo las que tomó. */
export const PERIMETROS: MedidaPredefinida[] = [
  'Cuello',
  'Pecho',
  'Brazo relajado',
  'Brazo contraído',
  'Cintura',
  'Abdomen',
  'Cadera',
  'Muslo',
  'Pantorrilla',
].map((nombre) => ({ tipo: 'PERIMETRO', nombre, unidad: 'cm' }))

export const PLIEGUES: MedidaPredefinida[] = [
  'Tríceps',
  'Bíceps',
  'Subescapular',
  'Suprailiaco',
  'Abdominal',
  'Muslo',
  'Pantorrilla',
].map((nombre) => ({ tipo: 'PLIEGUE', nombre, unidad: 'mm' }))

export const TESTS_FISICOS: MedidaPredefinida[] = [
  { tipo: 'TEST_FISICO', nombre: 'Flexiones en 1 minuto', unidad: 'rep' },
  { tipo: 'TEST_FISICO', nombre: 'Abdominales en 1 minuto', unidad: 'rep' },
  { tipo: 'TEST_FISICO', nombre: 'Salto horizontal', unidad: 'cm' },
  { tipo: 'TEST_FISICO', nombre: 'Plancha abdominal', unidad: 's' },
  { tipo: 'TEST_FISICO', nombre: 'Test de Cooper (12 min)', unidad: 'm' },
]

const formato = (n: number) => n.toLocaleString('es-CO')

export function mensajeRango(nombre: string, min: number, max: number, unidad: string): string {
  return `${nombre} debe estar entre ${formato(min)} y ${formato(max)} ${unidad}.`
}

/** Convierte lo que escribe la persona ("62,5") en número; null si está vacío. NaN si no es un número. */
export function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  return /^\d+(\.\d{1,2})?$/.test(limpio) ? Number(limpio) : Number.NaN
}

/** Índice de masa corporal (kg/m²) con un decimal, igual que el API. */
export function calcularImc(pesoKg: number, tallaCm: number): number {
  const metros = tallaCm / 100
  return Math.round((pesoKg / (metros * metros)) * 10) / 10
}
