import { NOMBRE_GRUPO } from './ejercicios/api'
import { NOMBRE_METODO, type Rutina } from './api'

interface Props {
  rutina: Rutina
  /**
   * Muestra el método también cuando es "Tradicional". El deportista lo necesita para
   * saber cómo hacer cada ejercicio (GYMM-22); al instructor le basta ver los distintos.
   */
  metodoSiempre?: boolean
}

/** Detalle de una rutina por días: cada ejercicio con sus series, repeticiones y método. */
export function RutinaDias({ rutina, metodoSiempre = false }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {rutina.dias.map(({ dia, ejercicios }) => (
        <section key={dia} aria-label={`Día ${dia}`}>
          <h3 className="titular text-2xl">
            Día {dia}{' '}
            <span className="font-sans text-base font-normal text-grafito normal-case">
              · {ejercicios.length === 1 ? '1 ejercicio' : `${ejercicios.length} ejercicios`}
            </span>
          </h3>
          <ol className="mt-2 border-t border-linea">
            {ejercicios.map((e, i) => (
              <li key={e.id} className="flex gap-3 border-b border-linea py-3">
                <span className="w-6 shrink-0 pt-0.5 text-right font-semibold text-grafito" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{e.ejercicio.nombre}</p>
                  <p className="text-sm text-grafito">
                    {NOMBRE_GRUPO[e.ejercicio.grupoMuscular]}
                    {(metodoSiempre || e.metodo !== 'TRADICIONAL') && ` · ${NOMBRE_METODO[e.metodo]}`}
                    {e.descansoSegundos !== null && ` · descanso ${e.descansoSegundos} s`}
                  </p>
                  {e.notas && <p className="mt-1 text-sm text-grafito">{e.notas}</p>}
                </div>
                <p className="shrink-0 text-right">
                  <span className="titular text-2xl normal-case">
                    {e.series} × {e.repeticionesObjetivo}
                  </span>
                  <span className="sr-only">
                    {' '}
                    ({e.series} series de {e.repeticionesObjetivo} repeticiones)
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
