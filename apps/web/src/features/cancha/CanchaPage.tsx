import { useState } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../components/Boton'
import { AVISO, AVISO_EXITO, ENLACE_PRIMARIO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useSesion } from '../auth/sesion'
import {
  NOMBRE_DIA,
  ROLES_GESTORES,
  diaYMes,
  sumarDias,
  textoSemana,
  useCancelarReservaCancha,
  useDisponibilidadCancha,
  useMisReservasCancha,
  useReservarCancha,
  type DiaDisponible,
  type EstadoFranja,
  type FranjaDelDia,
  type ReservaCancha,
} from './api'

/** "miércoles 28 de octubre de 14:00 a 15:00". */
const descripcion = (r: Pick<ReservaCancha, 'diaSemana' | 'fecha' | 'horaInicio' | 'horaFin'>) =>
  `${NOMBRE_DIA[r.diaSemana].toLowerCase()} ${diaYMes(r.fecha)} de ${r.horaInicio} a ${r.horaFin}`

/**
 * Franja que la persona tocó y está por confirmar: reservarla si está libre o,
 * para el personal de deportes, cancelar la reserva que la ocupa (GYMM-29).
 */
interface Eleccion {
  fecha: string
  diaSemana: number
  franja: FranjaDelDia
}

/** Cómo terminó el último intento de reserva; se muestra en el día de esa franja. */
interface Resultado {
  fecha: string
  exito: boolean
  texto: string
}

/** Disponibilidad de la cancha (GYMM-20), reserva de una franja libre (GYMM-28) y cancelación (GYMM-29). */
export function CanchaPage() {
  const { perfil } = useSesion()
  const puedeGestionar = !!perfil && (ROLES_GESTORES as readonly string[]).includes(perfil.rol)

  // null = la semana actual, según la fecha de Colombia que da el servidor.
  const [semana, setSemana] = useState<string | null>(null)
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useDisponibilidadCancha(semana)
  const reservar = useReservarCancha()
  const cancelar = useCancelarReservaCancha()
  const [eleccion, setEleccion] = useState<Eleccion | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  function cambiarSemana(nueva: string) {
    setEleccion(null)
    setResultado(null)
    setSemana(nueva)
  }

  function elegir(e: Eleccion | null) {
    setEleccion(e)
    setResultado(null)
  }

  function confirmar() {
    if (!eleccion) return
    const { fecha, franja } = eleccion
    const alTerminar = {
      onError: (e: Error) => setResultado({ fecha, exito: false, texto: e.message }),
      onSettled: () => setEleccion(null),
    }
    if (franja.reserva) {
      const { id, nombre } = franja.reserva
      const texto = `Reserva de ${nombre} cancelada: la franja del ${descripcion({ ...eleccion, ...franja })} quedó libre.`
      cancelar.mutate(id, { ...alTerminar, onSuccess: () => setResultado({ fecha, exito: true, texto }) })
      return
    }
    reservar.mutate(
      { franjaId: franja.id, fecha },
      { ...alTerminar, onSuccess: (r) => setResultado({ fecha, exito: true, texto: `Listo, la cancha es tuya el ${descripcion(r)}.` }) },
    )
  }

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

      <MisReservas />

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
              onClick={() => cambiarSemana(sumarDias(data.semana.desde, -7))}
              disabled={esSemanaActual || isPlaceholderData}
            >
              Anterior
            </Boton>
            <Boton
              variante="secundario"
              className="flex-1"
              aria-label="Semana siguiente"
              onClick={() => cambiarSemana(sumarDias(data.semana.desde, 7))}
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
              <p className="mt-3 text-grafito">Toca una franja libre para reservarla.</p>
              <ul
                aria-label="Días de la semana"
                className="mt-4 border-t border-linea md:grid md:grid-cols-2 md:gap-x-8 lg:grid-cols-3 lg:gap-x-10"
              >
                {data.dias.map((dia) => (
                  <li key={dia.fecha} className="border-b border-linea py-4">
                    <Dia
                      dia={dia}
                      esHoy={dia.fecha === data.hoy}
                      eleccion={eleccion?.fecha === dia.fecha ? eleccion : null}
                      resultado={resultado?.fecha === dia.fecha ? resultado : null}
                      ocupado={reservar.isPending || cancelar.isPending}
                      onElegir={elegir}
                      onConfirmar={confirmar}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Pantalla>
  )
}

/** Mis reservas que todavía no terminan (GYMM-28); cada una se puede cancelar (GYMM-29). */
function MisReservas() {
  const { data, isPending, isError, error, refetch } = useMisReservasCancha()
  // La mutación vive aquí y no en cada fila: al cancelar, la fila desaparece de la
  // lista y TanStack Query no avisa del resultado a un componente desmontado.
  const cancelar = useCancelarReservaCancha()
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function confirmar(r: ReservaCancha) {
    setAviso(null)
    cancelar.mutate(r.id, {
      onSuccess: () => setAviso(`Reserva cancelada: la franja del ${descripcion(r)} quedó libre.`),
      onSettled: () => setConfirmando(null),
    })
  }

  return (
    <section aria-labelledby="titulo-mis-reservas" className="mb-8">
      <h2 id="titulo-mis-reservas" className="titular text-3xl">
        Mis reservas
      </h2>
      {aviso && (
        <p role="status" className={`mt-3 ${AVISO_EXITO}`}>
          {aviso}
        </p>
      )}
      {isPending && (
        <p className="mt-3 text-grafito" role="status">
          Cargando tus reservas…
        </p>
      )}
      {isError && (
        <div role="alert" className={`mt-3 ${AVISO}`}>
          <p className="font-medium text-alerta">{error.message}</p>
          <Boton variante="texto" className="mt-1" onClick={() => void refetch()}>
            Intentar de nuevo
          </Boton>
        </div>
      )}
      {data?.length === 0 && (
        <div className={`mt-3 ${VACIO}`}>
          <p>Aún no tienes reservas.</p>
          <p className="mt-2 text-base text-grafito">Elige una franja libre de la semana para apartar la cancha a tu nombre.</p>
        </div>
      )}
      {data && data.length > 0 && (
        <ul aria-label="Tus reservas activas" className="mt-3 border-t border-linea">
          {data.map((r) => (
            <li key={r.id} className="border-b border-linea">
              <FilaReserva
                reserva={r}
                confirmando={confirmando === r.id}
                cancelando={cancelar.isPending}
                error={cancelar.variables === r.id ? cancelar.error : null}
                onPedir={() => setConfirmando(r.id)}
                onConfirmar={() => confirmar(r)}
                onMantener={() => setConfirmando(null)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface PropsFilaReserva {
  reserva: ReservaCancha
  confirmando: boolean
  cancelando: boolean
  error: Error | null
  onPedir: () => void
  onConfirmar: () => void
  onMantener: () => void
}

function FilaReserva({ reserva: r, confirmando, cancelando, error, onPedir, onConfirmar, onMantener }: PropsFilaReserva) {
  if (confirmando) {
    return (
      <div role="alertdialog" aria-label="Confirmar cancelación" className="py-3">
        <p className="font-semibold">¿Cancelar tu reserva del {descripcion(r)}?</p>
        <p className="mt-1 text-sm text-grafito">La franja quedará libre para otras personas.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Boton disabled={cancelando} onClick={onConfirmar}>
            {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
          </Boton>
          <Boton variante="texto" onClick={onMantener} disabled={cancelando}>
            No, mantenerla
          </Boton>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-x-3">
        <p className="flex-1 text-lg font-semibold">
          {NOMBRE_DIA[r.diaSemana]} {diaYMes(r.fecha)}
          <span className="ml-3 font-normal text-grafito">
            {r.horaInicio}–{r.horaFin}
          </span>
        </p>
        <Boton variante="texto" aria-label={`Cancelar tu reserva del ${descripcion(r)}`} onClick={onPedir}>
          Cancelar
        </Boton>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-alerta">
          {error.message}
        </p>
      )}
    </div>
  )
}

const ESTILO_FRANJA: Record<EstadoFranja, string> = {
  DISPONIBLE: 'border-[1.5px] border-negro bg-blanco text-negro',
  // Verde: lo que la persona eligió (sistema de diseño), siempre con texto negro.
  TUYA: 'border-[1.5px] border-verde bg-verde text-negro',
  RESERVADA: 'border border-linea bg-hueso text-grafito',
  PASADA: 'border border-dashed border-linea text-grafito',
}

const TEXTO_ESTADO: Record<EstadoFranja, string> = {
  DISPONIBLE: 'Libre',
  TUYA: 'Tuya',
  RESERVADA: 'Reservada',
  PASADA: 'Ya pasó',
}

interface PropsDia {
  dia: DiaDisponible
  esHoy: boolean
  eleccion: Eleccion | null
  resultado: Resultado | null
  ocupado: boolean
  onElegir: (e: Eleccion | null) => void
  onConfirmar: () => void
}

function Dia({ dia, esHoy, eleccion, resultado, ocupado, onElegir, onConfirmar }: PropsDia) {
  const nombre = `${NOMBRE_DIA[dia.diaSemana]} ${diaYMes(dia.fecha)}`
  const ocupante = eleccion?.franja.reserva
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
              <Franja
                franja={f}
                nombreDia={nombre}
                elegida={eleccion?.franja.id === f.id}
                onElegir={() => onElegir({ fecha: dia.fecha, diaSemana: dia.diaSemana, franja: f })}
              />
            </li>
          ))}
        </ul>
      )}

      {eleccion && (
        <div role="alertdialog" aria-label={ocupante ? 'Confirmar cancelación' : 'Confirmar reserva'} className={`mt-3 ${AVISO}`}>
          <p className="font-semibold">
            {ocupante ? `¿Cancelar la reserva de ${ocupante.nombre} del ` : '¿Reservar la cancha el '}
            {descripcion({ ...eleccion.franja, fecha: eleccion.fecha, diaSemana: eleccion.diaSemana })}?
          </p>
          <p className="mt-1 text-sm text-grafito">
            {ocupante ? 'La franja quedará libre para otras personas.' : 'Quedará a tu nombre.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Boton onClick={onConfirmar} disabled={ocupado}>
              {ocupado ? 'Un momento…' : ocupante ? 'Sí, cancelar la reserva' : 'Sí, reservar'}
            </Boton>
            <Boton variante="texto" onClick={() => onElegir(null)} disabled={ocupado}>
              {ocupante ? 'No, mantenerla' : 'Cancelar'}
            </Boton>
          </div>
        </div>
      )}

      {resultado &&
        (resultado.exito ? (
          <p role="status" className={`mt-3 ${AVISO_EXITO}`}>
            {resultado.texto}
          </p>
        ) : (
          <p role="alert" className={`mt-3 ${AVISO} font-medium text-alerta`}>
            {resultado.texto}
          </p>
        ))}
    </section>
  )
}

interface PropsFranja {
  franja: FranjaDelDia
  nombreDia: string
  /** La persona la tocó y está por confirmar: se marca en verde. */
  elegida: boolean
  onElegir: () => void
}

function Franja({ franja: f, nombreDia, elegida, onElegir }: PropsFranja) {
  const contenido = (
    <>
      <span className="block font-semibold">
        {f.horaInicio}–{f.horaFin}
      </span>
      {/* El personal de deportes ve a nombre de quién está cada franja ocupada. */}
      <span className="block truncate text-sm">{elegida ? 'Elegida' : (f.reserva?.nombre ?? TEXTO_ESTADO[f.estado])}</span>
    </>
  )
  const horario = `${nombreDia.toLowerCase()} de ${f.horaInicio} a ${f.horaFin}`
  if (f.estado !== 'DISPONIBLE' && !f.reserva) {
    return <div className={`rounded-xl px-3 py-2 ${ESTILO_FRANJA[f.estado]}`}>{contenido}</div>
  }
  // Una franja que se puede tocar es un botón con forma de franja: no hay un componente para eso.
  return (
    <button
      type="button"
      aria-label={f.reserva ? `Cancelar la reserva de ${f.reserva.nombre}, ${horario}` : `Reservar ${horario}`}
      aria-pressed={elegida}
      onClick={onElegir}
      className={`min-h-11 w-full rounded-xl px-3 py-2 text-left ${
        elegida ? ESTILO_FRANJA.TUYA : `${ESTILO_FRANJA[f.estado]} hover:bg-hueso`
      }`}
    >
      {contenido}
    </button>
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
