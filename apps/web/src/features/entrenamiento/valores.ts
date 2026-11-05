import type { EjercicioEnRutina, Metodo } from '../rutinas/api'
import type { PrecargaEjercicio, SerieNueva } from './api'

export type Valores = Pick<SerieNueva, 'cargaKg' | 'repeticiones'>

/** Métodos en que cada serie tiene sus propias repeticiones ("12-10-8"). */
const POR_SERIE: Metodo[] = ['PIRAMIDE', 'PIRAMIDE_INVERSA', 'SERIES_DESCENDENTES']

/**
 * Repeticiones que pide la rutina para una serie. "10-12" es un rango y se toma el
 * mínimo; en una pirámide "12-10-8" cada serie tiene las suyas. Un objetivo que no
 * son repeticiones ("45 s", "al fallo") da 0.
 */
export function repeticionesObjetivo(ejercicio: Pick<EjercicioEnRutina, 'repeticionesObjetivo' | 'metodo'>, numeroSerie: number) {
  const texto = ejercicio.repeticionesObjetivo.trim()
  if (!/^\d+(\s*[-–,]\s*\d+)*$/.test(texto)) return 0
  const numeros = texto.split(/[-–,]/).map((n) => Number(n.trim()))
  if (POR_SERIE.includes(ejercicio.metodo)) return numeros[Math.min(numeroSerie, numeros.length) - 1]
  return numeros[0]
}

/**
 * Con qué valores aparece una serie que aún no registro, para que confirmarla sea un
 * solo toque (GYMM-26). En orden: la misma serie de la última sesión, la serie anterior
 * de hoy, la última serie de la sesión pasada y, si nunca he hecho el ejercicio, las
 * repeticiones de la rutina sin carga.
 */
export function valoresIniciales(
  ejercicio: Pick<EjercicioEnRutina, 'repeticionesObjetivo' | 'metodo'>,
  numeroSerie: number,
  precarga: PrecargaEjercicio | undefined,
  hoy: Map<number, Valores>,
): Valores {
  const pasada = precarga?.series.find((s) => s.numeroSerie === numeroSerie)
  if (pasada) return { cargaKg: pasada.cargaKg, repeticiones: pasada.repeticiones }

  const anterior = hoy.get(numeroSerie - 1)
  if (anterior) return anterior

  const ultima = precarga?.series.at(-1)
  if (ultima) return { cargaKg: ultima.cargaKg, repeticiones: ultima.repeticiones }

  return { cargaKg: 0, repeticiones: repeticionesObjetivo(ejercicio, numeroSerie) }
}

const formatoCarga = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

/** "42,5 kg × 10". */
export const describirSerie = ({ cargaKg, repeticiones }: Valores) => `${formatoCarga.format(cargaKg)} kg × ${repeticiones}`
