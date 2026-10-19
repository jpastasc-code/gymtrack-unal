import { Link, useLocation, useParams } from 'react-router'
import { AVISO_EXITO, ENLACE_PRIMARIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useDeportista, useHistorialEvaluaciones } from './api'
import { TarjetaEvaluacion } from './TarjetaEvaluacion'

/** Historial de evaluaciones de un deportista, con acceso a registrar una nueva (GYMM-13). */
export function DeportistaEvaluacionesPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const recienGuardada = (location.state as { guardada?: boolean } | null)?.guardada
  const deportista = useDeportista(id)
  const historial = useHistorialEvaluaciones(id)

  const nombre = deportista.data ? `${deportista.data.nombres} ${deportista.data.apellidos}` : 'Deportista'

  return (
    <Pantalla titulo={nombre} volverA="/evaluaciones" estrecha>
      {deportista.isError && (
        <p role="alert" className="rounded-xl bg-hueso p-5 font-medium text-alerta">
          {deportista.error.message}
        </p>
      )}

      {deportista.data && (
        <>
          <p className="-mt-3 mb-5 text-grafito">Documento {deportista.data.documento}</p>
          {recienGuardada && (
            <p role="status" className={`mb-4 ${AVISO_EXITO}`}>
              Evaluación guardada.
            </p>
          )}
          <Link
            to={`/evaluaciones/${id}/nueva`}
            className={`mb-6 ${ENLACE_PRIMARIO}`}
          >
            Registrar evaluación
          </Link>

          {historial.isPending && <p className="text-grafito" role="status">Cargando evaluaciones…</p>}
          {historial.isError && (
            <p role="alert" className="font-medium text-alerta">
              {historial.error.message}
            </p>
          )}
          {historial.data?.length === 0 && (
            <p className="rounded-xl border-2 border-dashed border-linea p-5 text-lg">
              Aún no tiene evaluaciones. La primera que registres será su punto de partida.
            </p>
          )}
          {historial.data && historial.data.length > 0 && (
            <ol aria-label="Evaluaciones" className="flex flex-col gap-10">
              {historial.data.map((e, i) => (
                <li key={e.id}>
                  <TarjetaEvaluacion evaluacion={e} inicial={i === historial.data.length - 1} />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Pantalla>
  )
}
