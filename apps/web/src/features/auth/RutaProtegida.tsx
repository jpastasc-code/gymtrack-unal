import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Boton } from '../../components/Boton'
import { useSesion } from './sesion'
import type { Rol } from './tipos'

interface Props {
  /** Si se indica, solo estos roles pueden entrar. */
  roles?: Rol[]
  children?: ReactNode
}

/**
 * Exige sesión iniciada (y, si se indica, un rol) para mostrar su contenido.
 * Sin sesión, lleva al login recordando a dónde quería ir la persona.
 */
export function RutaProtegida({ roles, children }: Props) {
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

  if (roles?.length) {
    if (!perfil) {
      // Sin conexión no podemos confirmar el rol; no mostramos datos de otro rol.
      return (
        <PantallaMensaje titulo="No pudimos comprobar tu rol">
          <p className="mt-4 text-grafito">Revisa tu conexión a internet y vuelve a abrir esta pantalla.</p>
        </PantallaMensaje>
      )
    }
    if (!roles.includes(perfil.rol)) {
      return (
        <PantallaMensaje titulo="No tienes permiso para ver esta pantalla">
          <p className="mt-4 text-grafito">Si crees que es un error, habla con el personal del gimnasio.</p>
        </PantallaMensaje>
      )
    }
  }

  // Sin conexión (errores de red) dejamos entrar: cada pantalla muestra su propio estado.
  return children ?? <Outlet />
}

function PantallaMensaje({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6" role="status">
      <h1 className="titular text-5xl">{titulo}</h1>
      {children}
    </div>
  )
}
