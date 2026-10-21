import { useState } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../components/Boton'
import { AVISO, ENLACE_PRIMARIO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useSesion } from '../auth/sesion'
import {
  NOMBRE_DIA,
  ROLES_GESTORES,
  diaYMes,
  sumarDias,
  textoSemana,
  useDisponibilidadCancha,
  type DiaDisponible,
  type EstadoFranja,
  type FranjaDelDia,
} from './api'

/** Disponibilidad semanal de la cancha sintética (GYMM-20). La reserva llega en GYMM-28. */
export function CanchaPage() {
  const { perfil } = useSesion()
  const puedeGestionar = !!perfil && (ROLES_GESTORES as readonly string[]).includes(perfil.rol)

  // null = la semana actual, según la fecha de Colombia que da el servidor.
  const [semana, setSemana] = useState<string | null>(null)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useDisponibilidadCancha(semana)

  const esSemanaActual = !!data && data.semana.desde <= data.hoy && data.hoy <= data.semana.hasta
  const libres = data?.dias.reduce((total, d) => total + d.franjas.filter((f) => f.estado === 'DISPONIBLE').length, 0) ?? 0
  const sinHorario = !!data && data.dias.every((d) => d.franjas.length === 0)

  return (
    <Pantalla titulo="Cancha sintética" volverA="/reservas">
      {puedeGestionar && (
        <Link to="/reservas/cancha/franjas" className={`mb-6 ${ENLACE_PRIMARIO} md:w-fit`}>
          Definir franjas
        </Link>
      )}

      {isPending && (
        <p className="text-grafito" role="status">
          Cargando la disponibilidad…
        </p>
      )}

      {isError && (
        <div role="alert" className={AVISO}>
          <p className="font-medium text-alerta">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 font-semibold underline underline-offset-4">
            Intentar de nuevo
          </button>
        </div>
      )}

      {data && (
        <div aria-busy={isPlaceholderData}>
          <h2 className="text-lg font-semibold">{textoSemana(data.semana.desde, data.semana.hasta)}</h2>
          <div className="mt-3 flex gap-2 md:max-w-md">
            <Boton
              variante="secundario"
              className="flex-1"
              aria-label="Semana anterior"
              onClick={() => setSemana(sumarDias(data.semana.desde, -7))}
              disabled={esSemanaActual || isPlaceholderData}
            >
              Anterior
            </Boton>
            <Boton
              variante="secundario"
              className="flex-1"
              aria-label="Semana siguiente"
              onClick={() => setSemana(sumarDias(data.semana.desde, 7))}
              disabled={isPlaceholderData}
            >
              Siguiente
            </Boton>
          </div>

          <p className="mt-4 text-sm text-grafito" role="status">
            {sinHorario
              ? 'Sin franjas habilitadas'
              : libres === 1
                ? '1 franja libre esta semana'
                : `${libres} franjas libres esta semana`}
          </p>

          {sinHorario ? (
            <div className={`mt-3 ${VACIO}`}>
              <p>La cancha no tiene horarios habilitados esta semana.</p>
              <p className="mt-2 text-base text-grafito">
                {puedeGestionar
                  ? 'Agrega franjas con “Definir franjas” para que la gente vea cuándo puede usarla.'
                  : 'Mira la semana siguiente o pregunta en el área de deportes.'}
              </p>
            </div>
          ) : (
            <>
              <Convenciones />
              <ul
                aria-label="Días de la semana"
                className="mt-4 border-t border-linea md:grid md:grid-cols-2 md:gap-x-8 lg:grid-cols-3 lg:gap-x-10"
              >
                {data.dias.map((dia) => (
                  <li key={dia.fecha} className="border-b border-linea py-4">
                    <Dia dia={dia} esHoy={dia.fecha === data.hoy} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-grafito">Pronto podrás reservar una franja libre desde aquí.</p>
            </>
          )}
        </div>
      )}
    </Pantalla>
  )
}

const ESTILO_FRANJA: Record<EstadoFranja, string> = {
  DISPONIBLE: 'border-[1.5px] border-negro bg-blanco text-negro',
  RESERVADA: 'border border-linea bg-hueso text-grafito',
  PASADA: 'border border-dashed border-linea text-grafito',
}

const TEXTO_ESTADO: Record<EstadoFranja, string> = {
  DISPONIBLE: 'Libre',
  RESERVADA: 'Reservada',
  PASADA: 'Ya pasó',
}

function Dia({ dia, esHoy }: { dia: DiaDisponible; esHoy: boolean }) {
  const nombre = `${NOMBRE_DIA[dia.diaSemana]} ${diaYMes(dia.fecha)}`
  return (
    <section aria-label={nombre}>
      <h3 className="flex items-baseline gap-2 text-lg font-semibold">
        {nombre}
        {esHoy && <span className="text-sm font-normal text-grafito">Hoy</span>}
      </h3>
      {dia.franjas.length === 0 ? (
        <p className="mt-1 text-grafito">Sin horario habilitado.</p>
      ) : dia.franjas.every((f) => f.estado === 'PASADA') ? (
        // Un día que ya terminó no necesita una tarjeta por franja: solo estorba al buscar lo libre.
        <p className="mt-1 text-grafito">Ya pasaron todas las franjas de este día.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {dia.franjas.map((f) => (
            <li key={f.id}>
              <Franja franja={f} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Franja({ franja: f }: { franja: FranjaDelDia }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${ESTILO_FRANJA[f.estado]}`}>
      <p className="font-semibold">
        {f.horaInicio}–{f.horaFin}
      </p>
      <p className="text-sm">{TEXTO_ESTADO[f.estado]}</p>
    </div>
  )
}

/** Explica qué significa cada aspecto de franja, sin depender solo del color. */
function Convenciones() {
  return (
    <ul aria-label="Convenciones" className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-grafito">
      {(Object.keys(TEXTO_ESTADO) as EstadoFranja[]).map((estado) => (
        <li key={estado} className="flex items-center gap-2">
          <span aria-hidden="true" className={`size-4 rounded ${ESTILO_FRANJA[estado]}`} />
          {TEXTO_ESTADO[estado]}
        </li>
      ))}
    </ul>
  )
}
