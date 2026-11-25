import { lazy, Suspense } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Boton } from '../../components/Boton'
import { Selector } from '../../components/Controles'
import { AVISO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { NOMBRE_GRUPO } from '../rutinas/ejercicios/api'
import {
  formatoDia,
  formatoFecha,
  formatoSerie,
  useEjerciciosConHistorico,
  useHistoricoEjercicio,
  type HistoricoEjercicio,
} from './api'

// La gráfica usa Recharts, que pesa: se descarga solo al abrir un histórico.
const EvolucionEjercicio = lazy(() => import('./EvolucionEjercicio').then((m) => ({ default: m.EvolucionEjercicio })))

/**
 * Mis series en un ejercicio, por fecha, con la mejor marca destacada (GYMM-31)
 * y la gráfica de su evolución (GYMM-34).
 */
export function HistoricoEjercicioPage() {
  const { id = '' } = useParams()
  const { data, isPending, isError, error, refetch } = useHistoricoEjercicio(id)

  return (
    <Pantalla titulo={data?.ejercicio.nombre ?? 'Histórico'} volverA="/progreso" estrecha>
      {isPending && (
        <p className="text-grafito" role="status">
          Cargando tu histórico…
        </p>
      )}

      {isError && (
        <div role="alert" className={AVISO}>
          <p className="font-medium text-alerta">{error.message}</p>
          <Boton variante="texto" className="mt-3 -ml-2" onClick={() => void refetch()}>
            Intentar de nuevo
          </Boton>
        </div>
      )}

      {data && <Historico historico={data} />}
    </Pantalla>
  )
}

function Historico({ historico: { ejercicio, mejorMarca, sesiones } }: { historico: HistoricoEjercicio }) {
  return (
    <>
      <p className="-mt-3 mb-6 text-grafito">{NOMBRE_GRUPO[ejercicio.grupoMuscular]}</p>
      <CambiarEjercicio actual={ejercicio.id} />

      {mejorMarca === null ? (
        <p className={VACIO}>Aún no has registrado este ejercicio. Cuando lo hagas, aquí verás cada serie.</p>
      ) : (
        <section aria-labelledby="titulo-marca" className="bg-negro px-5 py-6 text-blanco md:px-8">
          <h2 id="titulo-marca" className="text-sm font-semibold text-blanco/75">
            Tu mejor marca
          </h2>
          <p className="titular mt-1 text-6xl normal-case">{formatoSerie(mejorMarca)}</p>
          <p className="mt-2 text-blanco/75">
            Serie {mejorMarca.numeroSerie} del {formatoFecha(mejorMarca.fecha)}
          </p>
        </section>
      )}

      <Suspense
        fallback={
          sesiones.length > 0 && (
            <p className="mt-10 text-grafito" role="status">
              Cargando tu gráfica…
            </p>
          )
        }
      >
        <EvolucionEjercicio sesiones={sesiones} />
      </Suspense>

      {sesiones.length > 0 && (
        <>
          <h2 className="titular mt-10 mb-4 text-3xl">Sesión por sesión</h2>
          <ol aria-label="Sesiones" className="flex flex-col gap-8">
            {sesiones.map((sesion) => (
              <li key={sesion.sesionId}>
                <h3 className="font-semibold first-letter:uppercase">{formatoDia(sesion.fecha)}</h3>
                <ul className="mt-2 border-t border-linea">
                  {sesion.series.map((serie) => {
                    const esMarca =
                      mejorMarca?.sesionId === sesion.sesionId && mejorMarca.numeroSerie === serie.numeroSerie
                    return (
                      <li key={serie.numeroSerie} className="flex items-center gap-3 border-b border-linea py-3">
                        <span className="flex-1 text-grafito">Serie {serie.numeroSerie}</span>
                        {esMarca && (
                          <span className="rounded-full bg-negro px-2.5 py-0.5 text-xs font-semibold text-blanco">
                            Mejor marca
                          </span>
                        )}
                        <span className={`text-lg ${esMarca ? 'font-bold' : 'font-semibold'}`}>{formatoSerie(serie)}</span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  )
}

/** Pasa a otro de mis ejercicios sin volver a la lista. Solo aparece si hay más de uno. */
function CambiarEjercicio({ actual }: { actual: string }) {
  const navigate = useNavigate()
  const { data: ejercicios } = useEjerciciosConHistorico()
  if (!ejercicios || ejercicios.length < 2 || !ejercicios.some((e) => e.ejercicio.id === actual)) return null

  return (
    <div className="mb-6">
      <Selector
        etiqueta="Ejercicio"
        value={actual}
        onChange={(e) => void navigate(`/progreso/ejercicios/${e.target.value}`, { replace: true })}
        opciones={ejercicios.map((e) => ({ valor: e.ejercicio.id, nombre: e.ejercicio.nombre }))}
      />
    </div>
  )
}
