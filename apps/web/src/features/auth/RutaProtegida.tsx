import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { Boton } from '../../components/Boton'
import { ENLACE_SECUNDARIO } from '../../components/estilos'
import { useSesion } from './sesion'
import type { Permiso } from './tipos'

interface Props {
  /** Si se indica, solo entra quien tiene este permiso (DT-16). */
  permiso?: Permiso
  /** Si es true, solo entra quien tiene al menos un permiso: el panel del personal. */
  personal?: boolean
  children?: ReactNode
}

/**
 * Exige sesión iniciada (y, si se indica, un permiso) para mostrar su contenido.
 * Sin sesión, lleva al login recordando a dónde quería ir la persona.
 */
export function RutaProtegida({ permiso, personal, children }: Props) {
  const { estado, perfil, cargandoPerfil, errorPerfil, cerrarSesion } = useSesion()
  const location = useLocation()

  if (estado === 'cargando' || (estado === 'con-sesion' && cargandoPerfil)) {
    return <PantallaMensaje titulo="Abriendo GymTrack…" />
  }

  if (estado === 'sin-sesion') {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />
  }

  if (errorPerfil?.status === 403) {
    return (
      <PantallaMensaje titulo="Tu cuenta no tiene acceso">
        <p className="mt-4 text-grafito">{errorPerfil.message}</p>
        <Boton variante="secundario" bloque className="mt-6" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </Boton>
      </PantallaMensaje>
    )
  }

  if (permiso || personal) {
    if (!perfil) {
      // Sin conexión no podemos confirmar los permisos; no mostramos pantallas del personal.
      return (
        <PantallaMensaje titulo="No pudimos comprobar tus permisos">
          <p className="mt-4 text-grafito">Revisa tu conexión a internet y vuelve a abrir esta pantalla.</p>
          <VolverAlInicio />
        </PantallaMensaje>
      )
    }
    const permitido = permiso ? perfil.permisos.includes(permiso) : perfil.permisos.length > 0
    if (!permitido) {
      return (
        <PantallaMensaje titulo="No tienes permiso para ver esta pantalla">
          <p className="mt-4 text-grafito">Si crees que es un error, habla con el personal del gimnasio.</p>
          <VolverAlInicio />
        </PantallaMensaje>
      )
    }
  }

  // Sin conexión (errores de red) dejamos entrar: cada pantalla muestra su propio estado.
  return children ?? <Outlet />
}

function VolverAlInicio() {
  return (
    <Link
      to="/"
      className={`mt-6 ${ENLACE_SECUNDARIO}`}
    >
      Ir al inicio
    </Link>
  )
}

function PantallaMensaje({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6" role="status">
      <h1 className="titular text-5xl">{titulo}</h1>
      {children}
    </div>
  )
}
