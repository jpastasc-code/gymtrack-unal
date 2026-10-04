import { Link, useLocation, useParams } from 'react-router'
import { AVISO_EXITO, ENLACE_PRIMARIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { OPCIONES_ACTIVIDAD } from '../auth/perfil'
import { useDeportista, useHistorialEvaluaciones, type Evaluacion, type Medida } from './api'

const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
const numero = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 })

const TITULO_TIPO: Record<Medida['tipo'], string> = {
  PERIMETRO: 'Perímetros',
  PLIEGUE: 'Pliegues cutáneos',
  TEST_FISICO: 'Tests de condición física',
}

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

function TarjetaEvaluacion({ evaluacion: e, inicial }: { evaluacion: Evaluacion; inicial: boolean }) {
  const actividad = OPCIONES_ACTIVIDAD.find((o) => o.valor === e.nivelActividad)?.titulo
  const grupos = (['PERIMETRO', 'PLIEGUE', 'TEST_FISICO'] as const)
    .map((tipo) => ({ tipo, medidas: e.medidas.filter((m) => m.tipo === tipo) }))
    .filter((g) => g.medidas.length > 0)

  return (
    <article className="border-t-2 border-negro pt-5">
      <h2 className="titular text-3xl">
        {inicial ? 'Evaluación inicial' : 'Evaluación'}, {fechaLarga.format(new Date(e.fecha))}
      </h2>
      <p className="text-sm text-grafito">
        Con {e.instructor.nombres} {e.instructor.apellidos}
        {actividad ? `. Actividad: ${actividad.toLowerCase()}` : ''}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato nombre="Peso" valor={`${numero(e.pesoKg)} kg`} />
        <Dato nombre="Talla" valor={`${numero(e.tallaCm)} cm`} />
        <Dato nombre="Grasa" valor={e.porcentajeGrasa === null ? 'Sin dato' : `${numero(e.porcentajeGrasa)} %`} />
        <Dato nombre="IMC" valor={numero(e.imc)} />
      </dl>

      {grupos.map((g) => (
        <div key={g.tipo} className="mt-4">
          <h3 className="font-semibold">{TITULO_TIPO[g.tipo]}</h3>
          <dl>
            {g.medidas.map((m) => (
              <div key={m.nombre} className="flex justify-between border-b border-linea py-2">
                <dt className="text-grafito">{m.nombre}</dt>
                <dd className="font-semibold">
                  {numero(m.valor)} {m.unidad}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      {e.observaciones && <p className="mt-4 text-grafito">{e.observaciones}</p>}
    </article>
  )
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="rounded-xl bg-hueso p-3">
      <dt className="text-sm text-grafito">{nombre}</dt>
      <dd className="titular mt-1 text-4xl normal-case">{valor}</dd>
    </div>
  )
}
