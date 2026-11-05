import { useState } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../components/Boton'
import { Chip } from '../../components/Chip'
import { AVISO, AVISO_EXITO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useMiRutina, type Rutina } from '../rutinas/api'
import {
  useCerrarSesion,
  useIniciarSesion,
  usePrecarga,
  useSesionActual,
  type PrecargaEjercicio,
  type Sesion,
} from './api'
import { RegistroEjercicio, type SerieHecha } from './RegistroEjercicio'
import { useRegistroSeries } from './useRegistroSeries'

/** Registro rápido de series mientras se entrena (GYMM-26). */
export function EntrenarPage() {
  const rutina = useMiRutina()
  const sesion = useSesionActual()
  const precarga = usePrecarga()
  const [terminada, setTerminada] = useState<number | null>(null)

  const consultas = [rutina, sesion, precarga]
  const fallida = consultas.find((c) => c.isError)

  return (
    <Pantalla titulo="Entrenar" estrecha>
      {fallida ? (
        <div role="alert" className={AVISO}>
          <p className="font-medium text-alerta">{fallida.error?.message}</p>
          <button
            type="button"
            onClick={() => consultas.filter((c) => c.isError).forEach((c) => void c.refetch())}
            className="mt-3 min-h-11 font-semibold underline underline-offset-4"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : consultas.some((c) => c.isPending) ? (
        <p className="text-grafito" role="status">
          Cargando tu entrenamiento…
        </p>
      ) : rutina.data === null || rutina.data === undefined ? (
        <div className={VACIO}>
          <p>Aún no tienes una rutina asignada.</p>
          <p className="mt-2 text-base text-grafito">
            Pídesela a tu instructor en el gimnasio. Cuando te la asigne, aquí registras cada serie.
          </p>
        </div>
      ) : sesion.data ? (
        <SesionEnCurso
          key={sesion.data.id}
          rutina={rutina.data}
          sesion={sesion.data}
          precarga={precarga.data ?? []}
          onTerminada={(series) => setTerminada(series)}
        />
      ) : (
        <>
          {terminada !== null && (
            <div role="status" className={`${AVISO_EXITO} mb-6`}>
              ¡Sesión terminada! Registraste {terminada === 1 ? '1 serie' : `${terminada} series`}.
            </div>
          )}
          <EmpezarSesion rutina={rutina.data} onEmpezada={() => setTerminada(null)} />
        </>
      )}
    </Pantalla>
  )
}

function EmpezarSesion({ rutina, onEmpezada }: { rutina: Rutina; onEmpezada: () => void }) {
  const dias = rutina.dias.map((d) => d.dia)
  const [dia, setDia] = useState(() => siguienteDia(rutina, dias))
  const iniciar = useIniciarSesion()
  const ejercicios = rutina.dias.find((d) => d.dia === dia)?.ejercicios ?? []

  function empezar() {
    iniciar.mutate(undefined, {
      onSuccess: (sesion) => {
        recordar(claveDiaSesion(sesion.id), dia)
        recordar(claveUltimoDia(rutina.id), dia)
        onEmpezada()
      },
    })
  }

  return (
    <>
      <h2 className="titular text-3xl">{rutina.nombre}</h2>
      {dias.length > 1 && (
        <div role="group" aria-label="Día de la rutina" className="mt-4 flex flex-wrap gap-2">
          {dias.map((d) => (
            <Chip key={d} activo={d === dia} onClick={() => setDia(d)}>
              {`Día ${d}`}
            </Chip>
          ))}
        </div>
      )}
      <ol className="mt-5 border-t border-linea">
        {ejercicios.map((e) => (
          <li key={e.id} className="flex justify-between gap-3 border-b border-linea py-3">
            <span className="font-semibold">{e.ejercicio.nombre}</span>
            <span className="shrink-0 text-grafito">
              {e.series} × {e.repeticionesObjetivo}
            </span>
          </li>
        ))}
      </ol>
      <Boton bloque grande className="mt-6" onClick={empezar} disabled={iniciar.isPending}>
        {iniciar.isPending ? 'Empezando…' : 'Empezar a entrenar'}
      </Boton>
      {iniciar.isError && (
        <p role="alert" className="mt-3 font-medium text-alerta">
          {iniciar.error.message}
        </p>
      )}
    </>
  )
}

function SesionEnCurso({
  rutina,
  sesion,
  precarga,
  onTerminada,
}: {
  rutina: Rutina
  sesion: Sesion
  precarga: PrecargaEjercicio[]
  onTerminada: (series: number) => void
}) {
  const dias = rutina.dias.map((d) => d.dia)
  const [dia, setDia] = useState(() => diaDeSesion(rutina, sesion, dias))
  const ejercicios = rutina.dias.find((d) => d.dia === dia)?.ejercicios ?? []
  const { series, pendientes, sinConexion, error, registrar, reintentar } = useRegistroSeries(sesion)
  const cerrar = useCerrarSesion()
  const [confirmando, setConfirmando] = useState(false)

  const hechas = new Map<string, Map<number, SerieHecha>>()
  for (const { ejercicioId, numeroSerie, ...valores } of series) {
    const delEjercicio = hechas.get(ejercicioId) ?? new Map<number, SerieHecha>()
    delEjercicio.set(numeroSerie, valores)
    hechas.set(ejercicioId, delEjercicio)
  }

  const deEjercicio = (e: (typeof ejercicios)[number]) => hechas.get(e.ejercicio.id) ?? new Map<number, SerieHecha>()
  const completas = (e: (typeof ejercicios)[number]) => [...deEjercicio(e).keys()].filter((n) => n <= e.series).length
  const total = ejercicios.reduce((suma, e) => suma + e.series, 0)
  const hechasHoy = ejercicios.reduce((suma, e) => suma + completas(e), 0)
  const registradas = series.length

  const [indice, setIndice] = useState(() => primeroPendiente(ejercicios, completas))
  const actual = ejercicios[Math.min(indice, ejercicios.length - 1)]
  const actualCompleto = actual ? completas(actual) >= actual.series : false

  function cambiarDia(nuevo: number) {
    setDia(nuevo)
    recordar(claveDiaSesion(sesion.id), nuevo)
    recordar(claveUltimoDia(rutina.id), nuevo)
    const delDia = rutina.dias.find((d) => d.dia === nuevo)?.ejercicios ?? []
    setIndice(primeroPendiente(delDia, completas))
  }

  function terminar() {
    if (hechasHoy < total && !confirmando) {
      setConfirmando(true)
      return
    }
    cerrar.mutate(sesion.id, { onSuccess: () => onTerminada(registradas) })
  }

  return (
    <>
      {dias.length > 1 && (
        <div role="group" aria-label="Día de la rutina" className="mb-5 flex flex-wrap gap-2">
          {dias.map((d) => (
            <Chip key={d} activo={d === dia} onClick={() => cambiarDia(d)}>
              {`Día ${d}`}
            </Chip>
          ))}
        </div>
      )}

      <div className="mb-6">
        <p className="flex justify-between text-sm font-semibold">
          <span>Progreso de la sesión</span>
          <span>
            {hechasHoy} de {total} series
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Series completadas"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={hechasHoy}
          className="mt-2 h-2 overflow-hidden rounded-full bg-hueso"
        >
          <div className="h-full rounded-full bg-verde" style={{ width: `${total ? (hechasHoy / total) * 100 : 0}%` }} />
        </div>
      </div>

      {sinConexion && (
        <div role="status" className={`${AVISO} mb-5`}>
          <p className="font-semibold">Sin conexión con el servidor.</p>
          <p className="mt-1 text-grafito">
            {pendientes === 1
              ? 'Tu última serie quedó guardada en este celular y se envía sola cuando vuelva la señal.'
              : `${pendientes} series quedaron guardadas en este celular y se envían solas cuando vuelva la señal.`}
          </p>
          <button type="button" onClick={() => void reintentar()} className="mt-2 min-h-11 font-semibold underline underline-offset-4">
            Reintentar ahora
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className={`${AVISO} mb-5 font-medium text-alerta`}>
          {error}
        </p>
      )}

      {actual ? (
        <>
          <p className="mb-2 text-sm text-grafito">
            Ejercicio {indice + 1} de {ejercicios.length}
          </p>
          <RegistroEjercicio
            key={actual.id}
            ejercicio={actual}
            hechas={deEjercicio(actual)}
            sinConexion={sinConexion}
            precarga={precarga.find((p) => p.ejercicioId === actual.ejercicio.id)}
            onRegistrar={registrar}
          />
          {actualCompleto && indice < ejercicios.length - 1 && (
            <Boton bloque grande className="mt-5" onClick={() => setIndice(indice + 1)}>
              Siguiente ejercicio
            </Boton>
          )}
          <div className="mt-4 flex gap-3">
            <Boton variante="secundario" className="flex-1" disabled={indice === 0} onClick={() => setIndice(indice - 1)}>
              Anterior
            </Boton>
            <Boton
              variante="secundario"
              className="flex-1"
              disabled={indice >= ejercicios.length - 1}
              onClick={() => setIndice(indice + 1)}
            >
              Siguiente
            </Boton>
          </div>
        </>
      ) : (
        <div className={VACIO}>
          <p>Este día de tu rutina no tiene ejercicios.</p>
        </div>
      )}

      <div className="mt-8 border-t border-linea pt-6">
        {confirmando && hechasHoy < total && (
          <p className="mb-3">
            Te {total - hechasHoy === 1 ? 'falta 1 serie' : `faltan ${total - hechasHoy} series`}. ¿Terminar de todos modos?
          </p>
        )}
        {pendientes > 0 ? (
          <p className="text-grafito">Para terminar la sesión, espera a que se envíen las series guardadas en este celular.</p>
        ) : (
          <Boton variante={actualCompleto && hechasHoy >= total ? 'primario' : 'secundario'} bloque grande onClick={terminar} disabled={cerrar.isPending}>
            {cerrar.isPending ? 'Terminando…' : confirmando ? 'Sí, terminar sesión' : 'Terminar sesión'}
          </Boton>
        )}
        {cerrar.isError && (
          <p role="alert" className="mt-3 font-medium text-alerta">
            {cerrar.error.message}
          </p>
        )}
        <Link to="/rutina" className="mt-3 flex min-h-11 items-center justify-center font-semibold underline underline-offset-4">
          Ver mi rutina completa
        </Link>
      </div>
    </>
  )
}

const primeroPendiente = <T extends { series: number }>(ejercicios: T[], completas: (e: T) => number) =>
  Math.max(0, ejercicios.findIndex((e) => completas(e) < e.series))

// El día se recuerda en este navegador: el de la sesión abierta, para volver a la pantalla
// en el mismo punto, y el último entrenado, para proponer el siguiente la próxima vez.
const claveDiaSesion = (sesionId: string) => `gymtrack:entrenar:${sesionId}:dia`
const claveUltimoDia = (rutinaId: string) => `gymtrack:entrenar:${rutinaId}:ultimo-dia`

function leerNumero(clave: string): number | null {
  try {
    const valor = Number(localStorage.getItem(clave))
    return Number.isInteger(valor) && valor > 0 ? valor : null
  } catch {
    return null
  }
}

function recordar(clave: string, dia: number) {
  try {
    localStorage.setItem(clave, String(dia))
  } catch {
    // No es grave: solo se pierde el recuerdo del día.
  }
}

/** Después del último día entrenado sigue el próximo; tras el último, vuelve al primero. */
function siguienteDia(rutina: Rutina, dias: number[]): number {
  const ultimo = leerNumero(claveUltimoDia(rutina.id))
  const i = ultimo === null ? -1 : dias.indexOf(ultimo)
  return dias[(i + 1) % dias.length]
}

/** El día de la sesión abierta: el guardado, o el de los ejercicios que ya registré (otro celular). */
function diaDeSesion(rutina: Rutina, sesion: Sesion, dias: number[]): number {
  const guardado = leerNumero(claveDiaSesion(sesion.id))
  if (guardado !== null && dias.includes(guardado)) return guardado
  const hechos = new Set(sesion.series.map((s) => s.ejercicioId))
  const conSeries = rutina.dias.find((d) => d.ejercicios.some((e) => hechos.has(e.ejercicio.id)))
  return conSeries?.dia ?? dias[0]
}
