import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { ENLACE_PRIMARIO } from '../components/estilos'

/** Pantalla para rutas que no existen o errores inesperados al mostrar una pantalla. */
export function ErrorRuta() {
  const error = useRouteError()
  const noExiste = isRouteErrorResponse(error) && error.status === 404

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <h1 className="titular text-5xl">
        {noExiste ? 'Esta página no existe' : 'Algo falló al abrir esta pantalla'}
      </h1>
      <p className="mt-4 text-grafito">
        {noExiste
          ? 'Revisa la dirección o vuelve al inicio.'
          : 'Vuelve al inicio e inténtalo de nuevo. Si sigue pasando, avísale al equipo de GymTrack.'}
      </p>
      <Link to="/" className={`mt-8 ${ENLACE_PRIMARIO}`}>
        Ir al inicio
      </Link>
    </div>
  )
}
