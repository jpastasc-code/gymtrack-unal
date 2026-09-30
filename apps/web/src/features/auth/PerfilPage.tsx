import { Boton } from '../../components/Boton'
import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'
import { useSesion } from './sesion'
import { NOMBRE_ROL } from './tipos'

export function PerfilPage() {
  const { perfil, session, cerrarSesion } = useSesion()

  return (
    <Pantalla titulo="Perfil">
      <section className="rounded-2xl bg-superficie p-5">
        {perfil ? (
          <>
            <h2 className="font-display text-2xl font-semibold">
              {perfil.nombres} {perfil.apellidos}
            </h2>
            <p className="mt-1 text-gris">{perfil.correo}</p>
            <p className="mt-3 inline-block rounded-full bg-campus-claro px-3 py-1 text-sm font-semibold text-campus-oscuro">
              {NOMBRE_ROL[perfil.rol]}
            </p>
          </>
        ) : (
          <p className="text-gris">{session?.user.email ?? 'Sin conexión: no se pudo cargar tu perfil.'}</p>
        )}
      </section>

      <div className="mt-3">
        <EnConstruccion
          historia="GYMM-11 y GYMM-24"
          descripcion="Aquí podrás actualizar tus datos personales y tu objetivo de entrenamiento."
        />
      </div>

      <Boton variante="secundario" bloque className="mt-6" onClick={() => void cerrarSesion()}>
        Cerrar sesión
      </Boton>
    </Pantalla>
  )
}
