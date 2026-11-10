/**
 * Progreso del deportista (GYMM-31): la mejor marca de un ejercicio a partir de sus series.
 * La usan el API, para el histórico, y la web.
 */

/** Una serie hecha, con la fecha de la sesión en que se hizo (ISO 8601). */
export interface SerieHecha {
  cargaKg: number
  repeticiones: number
  fecha: string
}

/**
 * La mejor marca es la serie con más carga. Si dos tienen la misma carga gana la de más
 * repeticiones, y si también empatan, la primera vez que se logró: es la fecha de la marca.
 * Así un ejercicio sin peso (carga 0) también tiene marca: el máximo de repeticiones.
 * Devuelve null si no hay series.
 */
export function mejorMarca<T extends SerieHecha>(series: readonly T[]): T | null {
  let mejor: T | null = null
  for (const s of series) {
    if (
      mejor === null ||
      s.cargaKg > mejor.cargaKg ||
      (s.cargaKg === mejor.cargaKg && s.repeticiones > mejor.repeticiones) ||
      (s.cargaKg === mejor.cargaKg && s.repeticiones === mejor.repeticiones && s.fecha < mejor.fecha)
    ) {
      mejor = s
    }
  }
  return mejor
}
