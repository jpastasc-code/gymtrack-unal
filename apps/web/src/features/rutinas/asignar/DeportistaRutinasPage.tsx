import { Link, useLocation, useParams } from 'react-router'
import { AVISO_EXITO, ENLACE_PRIMARIO, VACIO } from '../../../components/estilos'
import { Pantalla } from '../../../components/Pantalla'
import { useDeportista } from '../../evaluacion/api'
import { useRutinasDeportista, type Rutina } from '../api'
import { RutinaDias } from '../RutinaDias'

const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

/** Rutina vigente de un deportista y las anteriores, con acceso a asignar una nueva (GYMM-21). */
export function DeportistaRutinasPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const recienAsignada = (location.state as { asignada?: boolean } | null)?.asignada
  const deportista = useDeportista(id)
  const rutinas = useRutinasDeportista(id)

  const nombre = deportista.data ? `${deportista.data.nombres} ${deportista.data.apellidos}` : 'Deportista'
  const vigente = rutinas.data?.find((r) => r.vigente)
  const anteriores = rutinas.data?.filter((r) => !r.vigente) ?? []

  return (
    <Pantalla titulo={nombre} volverA="/rutinas" estrecha>
      {deportista.isError && (
        <p role="alert" className="rounded-xl bg-hueso p-5 font-medium text-alerta">
          {deportista.error.message}
        </p>
      )}

      {deportista.data && (
        <>
          <p className="-mt-3 mb-5 text-grafito">Documento {deportista.data.documento}</p>
          {recienAsignada && (
            <p role="status" className={`mb-4 ${AVISO_EXITO}`}>
              Rutina asignada. Ya la puede ver en su celular.
            </p>
          )}
          <Link to={`/rutinas/${id}/nueva`} className={`mb-8 ${ENLACE_PRIMARIO}`}>
            {vigente ? 'Asignar rutina nueva' : 'Asignar rutina'}
          </Link>

          {rutinas.isPending && <p className="text-grafito" role="status">Cargando rutinas…</p>}
          {rutinas.isError && (
            <p role="alert" className="font-medium text-alerta">
              {rutinas.error.message}
            </p>
          )}
          {rutinas.data && !vigente && (
            <p className={VACIO}>No tiene una rutina vigente. La que le asignes le aparecerá en su celular.</p>
          )}
          {vigente && (
            <article className="border-t-2 border-negro pt-5" aria-labelledby="rutina-vigente">
              <p className="text-sm font-semibold tracking-wide text-verde-tinta uppercase">Vigente</p>
              <EncabezadoRutina rutina={vigente} id="rutina-vigente" />
              <div className="mt-5">
                <RutinaDias rutina={vigente} />
              </div>
            </article>
          )}

          {anteriores.length > 0 && (
            <section className="mt-10" aria-labelledby="rutinas-anteriores">
              <h2 id="rutinas-anteriores" className="titular text-3xl">
                Rutinas anteriores
              </h2>
              <ul className="mt-3 flex flex-col gap-3">
                {anteriores.map((r) => (
                  <li key={r.id}>
                    <details className="rounded-xl bg-hueso p-4">
                      <summary className="flex min-h-11 cursor-pointer flex-col justify-center">
                        <span className="font-semibold">{r.nombre}</span>
                        <span className="text-sm text-grafito">Asignada el {fechaLarga.format(new Date(r.fechaAsignacion))}</span>
                      </summary>
                      <div className="mt-4">
                        <RutinaDias rutina={r} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Pantalla>
  )
}

function EncabezadoRutina({ rutina: r, id }: { rutina: Rutina; id: string }) {
  return (
    <>
      <h2 id={id} className="titular mt-1 text-4xl">
        {r.nombre}
      </h2>
      <p className="text-sm text-grafito">
        Asignada el {fechaLarga.format(new Date(r.fechaAsignacion))} por {r.instructor.nombres} {r.instructor.apellidos} ·{' '}
        {r.dias.length === 1 ? '1 día' : `${r.dias.length} días`}
      </p>
      {r.descripcion && <p className="mt-3">{r.descripcion}</p>}
    </>
  )
}
