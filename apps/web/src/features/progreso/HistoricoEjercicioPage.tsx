import { useParams } from 'react-router'
import { Boton } from '../../components/Boton'
import { AVISO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { NOMBRE_GRUPO } from '../rutinas/ejercicios/api'
import { formatoDia, formatoFecha, formatoSerie, useHistoricoEjercicio, type HistoricoEjercicio } from './api'

/** Mis series en un ejercicio, por fecha, con la mejor marca destacada (GYMM-31). */
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

      {sesiones.length > 0 && (
        <ol aria-label="Sesiones" className="mt-8 flex flex-col gap-8">
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
      )}
    </>
  )
}
