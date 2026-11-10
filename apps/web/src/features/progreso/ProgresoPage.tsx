import { Link } from 'react-router'
import { Boton } from '../../components/Boton'
import { EnConstruccion } from '../../components/EnConstruccion'
import { AVISO, ENLACE_PRIMARIO, VACIO } from '../../components/estilos'
import { IconoFlecha } from '../../components/iconos'
import { Pantalla } from '../../components/Pantalla'
import { NOMBRE_GRUPO } from '../rutinas/ejercicios/api'
import { formatoFecha, formatoSerie, useEjerciciosConHistorico, type EjercicioConHistorico } from './api'

/** Progreso: los ejercicios que he hecho con su mejor marca (GYMM-31). */
export function ProgresoPage() {
  const { data: ejercicios, isPending, isError, error, refetch } = useEjerciciosConHistorico()

  return (
    <Pantalla titulo="Progreso" volverA="/">
      <section aria-labelledby="titulo-ejercicios">
        <h2 id="titulo-ejercicios" className="titular mb-1 text-3xl">
          Tus ejercicios
        </h2>
        <p className="mb-4 text-grafito">Elige uno para ver tus cargas y repeticiones, sesión por sesión.</p>

        {isPending && (
          <p className="text-grafito" role="status">
            Cargando tu progreso…
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

        {ejercicios?.length === 0 && (
          <div className={VACIO}>
            <p>Aún no has registrado series. Cuando entrenes, aquí verás tu histórico en cada ejercicio.</p>
            <Link to="/entrenar" className={`mt-5 ${ENLACE_PRIMARIO}`}>
              Ir a entrenar
            </Link>
          </div>
        )}

        {ejercicios && ejercicios.length > 0 && (
          <ul aria-label="Ejercicios con histórico" className="border-t border-linea md:grid md:grid-cols-2 md:gap-x-8 lg:gap-x-10">
            {ejercicios.map((e) => (
              <li key={e.ejercicio.id} className="border-b border-linea">
                <FilaEjercicio datos={e} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <EnConstruccion
          historia="GYMM-34 y GYMM-35"
          descripcion="Pronto verás también cómo cambian tus medidas corporales entre evaluaciones."
        />
      </section>
    </Pantalla>
  )
}

function FilaEjercicio({ datos: { ejercicio, sesiones, ultimaFecha, mejorMarca } }: { datos: EjercicioConHistorico }) {
  return (
    <Link to={`/progreso/ejercicios/${ejercicio.id}`} className="flex min-h-16 items-center gap-3 py-4 hover:bg-hueso">
      <div className="flex-1">
        <p className="text-lg font-semibold">{ejercicio.nombre}</p>
        <p className="text-sm text-grafito">
          {NOMBRE_GRUPO[ejercicio.grupoMuscular]} · {sesiones === 1 ? '1 sesión' : `${sesiones} sesiones`} · última el{' '}
          {formatoFecha(ultimaFecha)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-grafito">Mejor marca</p>
        <p className="font-semibold">{formatoSerie(mejorMarca)}</p>
      </div>
      <IconoFlecha className="shrink-0" />
    </Link>
  )
}
