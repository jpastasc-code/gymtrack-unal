/**
 * Progreso del deportista: la mejor marca de un ejercicio a partir de sus series (GYMM-31)
 * y su evolución sesión por sesión (GYMM-34). La usan el API, para el histórico, y la web.
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

/** Las series de un ejercicio hechas en una sesión. */
export interface SesionConSeries {
  /** Inicio de la sesión (ISO 8601). */
  fecha: string
  series: readonly { cargaKg: number; repeticiones: number }[]
}

/** Un punto de la gráfica de evolución: lo que se hizo en un ejercicio en una sesión. */
export interface PuntoEvolucion {
  fecha: string
  /** La carga más alta que se levantó en la sesión. */
  cargaMaximaKg: number
  /** Volumen total: la suma de repeticiones × carga de cada serie. */
  volumenKg: number
}

/**
 * La evolución de un ejercicio, de la sesión más antigua a la más reciente.
 * El volumen suma repeticiones × carga de cada serie, así que 3 series de 10 con 50 kg son 1.500 kg.
 * Se redondea a un decimal para que las cargas como 42,5 kg no dejen restos de coma flotante.
 * Las sesiones sin series no aportan puntos.
 */
export function evolucionPorSesion(sesiones: readonly SesionConSeries[]): PuntoEvolucion[] {
  return sesiones
    .filter((s) => s.series.length > 0)
    .map((s) => ({
      fecha: s.fecha,
      cargaMaximaKg: Math.max(...s.series.map((serie) => serie.cargaKg)),
      volumenKg: Math.round(s.series.reduce((total, serie) => total + serie.cargaKg * serie.repeticiones, 0) * 10) / 10,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}
