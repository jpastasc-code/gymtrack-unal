import { useState } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../components/Boton'
import { Chip } from '../../components/Chip'
import { AVISO, AVISO_EXITO, ENLACE_PRIMARIO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useSesion } from '../auth/sesion'
import { NOMBRE_DIA, ROLES_GESTORES, diaYMes } from '../cancha/api'
import {
  useCancelarCupo,
  useDisponibilidadGimnasio,
  useMisReservasGimnasio,
  useReservarCupo,
  type FranjaConCupo,
  type ReservaGimnasio,
} from './api'

/** "lunes 10 de noviembre de 18:00 a 19:00". */
const descripcion = (r: Pick<ReservaGimnasio, 'diaSemana' | 'fecha' | 'horaInicio' | 'horaFin'>) =>
  `${NOMBRE_DIA[r.diaSemana].toLowerCase()} ${diaYMes(r.fecha)} de ${r.horaInicio} a ${r.horaFin}`

const cupos = (n: number) => (n === 1 ? '1 cupo libre' : `${n} cupos libres`)

/** Reserva de cupo en el gimnasio por franja horaria (GYMM-27). */
export function ReservaGimnasioPage() {
  const { perfil } = useSesion()
  const puedeGestionar = !!perfil && (ROLES_GESTORES as readonly string[]).includes(perfil.rol)
  const { data, isPending, isError, error, refetch } = useDisponibilidadGimnasio()
  const reservar = useReservarCupo()
  // null = hoy, según la fecha de Colombia que da el servidor.
  const [fecha, setFecha] = useState<string | null>(null)
  const [aviso, setAviso] = useState<{ exito: boolean; texto: string } | null>(null)

  const dia = data?.dias.find((d) => d.fecha === (fecha ?? data.hoy)) ?? data?.dias[0]
  const porVenir = dia?.franjas.filter((f) => f.estado !== 'PASADA') ?? []

  function elegirDia(nueva: string) {
    setFecha(nueva)
    setAviso(null)
  }

  function reservarFranja(f: FranjaConCupo) {
    if (!dia) return
    setAviso(null)
    reservar.mutate(
      { franjaId: f.id, fecha: dia.fecha },
      {
        onSuccess: (r) => setAviso({ exito: true, texto: `Listo, tienes cupo el ${descripcion(r)}.` }),
        onError: (e) => setAviso({ exito: false, texto: e.message }),
      },
    )
  }

  return (
    <Pantalla titulo="Gimnasio" volverA="/reservas" estrecha>
      {puedeGestionar && (
        <Link to="/reservas/gimnasio/franjas" className={`mb-6 ${ENLACE_PRIMARIO} md:w-fit`}>
          Configurar cupos
        </Link>
      )}

      {/* Al cancelar, el aviso de una reserva ya cancelada deja de tener sentido. */}
      <MisReservas onCancelada={() => setAviso(null)} />

      <h2 className="titular text-3xl">Reservar cupo</h2>
      {isPending && (
        <p className="mt-3 text-grafito" role="status">
          Cargando los cupos…
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

      {data && dia && (
        <>
          <div role="group" aria-label="Día" className="mt-4 flex flex-wrap gap-2">
            {data.dias.map((d, i) => (
              <Chip key={d.fecha} activo={d.fecha === dia.fecha} onClick={() => elegirDia(d.fecha)}>
                {i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${NOMBRE_DIA[d.diaSemana].slice(0, 3)} ${Number(d.fecha.slice(8))}`}
              </Chip>
            ))}
          </div>
          <p className="mt-4 text-lg font-semibold">
            {NOMBRE_DIA[dia.diaSemana]} {diaYMes(dia.fecha)}
          </p>

          {aviso && (
            <p role={aviso.exito ? 'status' : 'alert'} className={`mt-3 ${aviso.exito ? AVISO_EXITO : `${AVISO} font-medium text-alerta`}`}>
              {aviso.texto}
            </p>
          )}

          {dia.franjas.length === 0 ? (
            <div className={`mt-3 ${VACIO}`}>
              <p>El gimnasio no abre este día.</p>
              <p className="mt-2 text-base text-grafito">Elige otro día de la semana.</p>
            </div>
          ) : porVenir.length === 0 ? (
            <div className={`mt-3 ${VACIO}`}>
              <p>Ya pasaron todas las franjas de este día.</p>
              <p className="mt-2 text-base text-grafito">Reserva para mañana o los días siguientes.</p>
            </div>
          ) : (
            <ul aria-label="Franjas del día" className="mt-3 border-t border-linea">
              {porVenir.map((f) => (
                <li key={f.id} className="flex min-h-16 items-center gap-3 border-b border-linea py-2">
                  <div className="flex-1">
                    <p className="text-lg font-semibold tabular-nums">
                      {f.horaInicio}–{f.horaFin}
                    </p>
                    <p className="text-sm text-grafito">
                      {f.estado === 'LLENA' ? `Llena · ${f.cupoMaximo} cupos` : `${cupos(f.libres)} de ${f.cupoMaximo}`}
                    </p>
                  </div>
                  {f.estado === 'TUYA' ? (
                    // Verde: lo que la persona eligió, con texto negro (sistema de diseño).
                    <span className="rounded-full bg-verde px-4 py-2 font-semibold text-negro">Tu cupo</span>
                  ) : f.estado === 'DISPONIBLE' ? (
                    <Boton
                      variante="secundario"
                      aria-label={`Reservar cupo el ${descripcion({ ...f, fecha: dia.fecha, diaSemana: dia.diaSemana })}`}
                      disabled={reservar.isPending}
                      onClick={() => reservarFranja(f)}
                    >
                      {reservar.isPending && reservar.variables?.franjaId === f.id ? 'Reservando…' : 'Reservar'}
                    </Boton>
                  ) : (
                    <span className="text-grafito">Sin cupos</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Pantalla>
  )
}

/** Mis cupos reservados que todavía no terminan; cada uno se puede cancelar antes de empezar. */
function MisReservas({ onCancelada }: { onCancelada: () => void }) {
  const { data, isPending, isError, error, refetch } = useMisReservasGimnasio()
  // La mutación vive aquí y no en cada fila: al cancelar, la fila desaparece.
  const cancelar = useCancelarCupo()
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function confirmar(r: ReservaGimnasio) {
    setAviso(null)
    cancelar.mutate(r.id, {
      onSuccess: () => {
        setAviso(`Reserva cancelada: liberaste tu cupo del ${descripcion(r)}.`)
        onCancelada()
      },
      onSettled: () => setConfirmando(null),
    })
  }

  return (
    <section aria-labelledby="titulo-mis-cupos" className="mb-8">
      <h2 id="titulo-mis-cupos" className="titular text-3xl">
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
          <p>Aún no tienes cupos reservados.</p>
          <p className="mt-2 text-base text-grafito">Elige un día y una franja abajo para apartar tu espacio.</p>
        </div>
      )}
      {data && data.length > 0 && (
        <ul aria-label="Tus cupos reservados" className="mt-3 border-t border-linea">
          {data.map((r) => (
            <li key={r.id} className="border-b border-linea py-2">
              {confirmando === r.id ? (
                <div role="alertdialog" aria-label="Confirmar cancelación" className="py-1">
                  <p className="font-semibold">¿Cancelar tu cupo del {descripcion(r)}?</p>
                  <p className="mt-1 text-sm text-grafito">Quedará libre para otra persona.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Boton disabled={cancelar.isPending} onClick={() => confirmar(r)}>
                      {cancelar.isPending ? 'Cancelando…' : 'Sí, cancelar'}
                    </Boton>
                    <Boton variante="texto" disabled={cancelar.isPending} onClick={() => setConfirmando(null)}>
                      No, mantenerlo
                    </Boton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-3">
                  <p className="flex-1 text-lg font-semibold">
                    {NOMBRE_DIA[r.diaSemana]} {diaYMes(r.fecha)}
                    <span className="ml-3 font-normal text-grafito">
                      {r.horaInicio}–{r.horaFin}
                    </span>
                  </p>
                  <Boton variante="texto" aria-label={`Cancelar tu cupo del ${descripcion(r)}`} onClick={() => setConfirmando(r.id)}>
                    Cancelar
                  </Boton>
                </div>
              )}
              {cancelar.variables === r.id && cancelar.error && (
                <p role="alert" className="text-sm font-medium text-alerta">
                  {cancelar.error.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
