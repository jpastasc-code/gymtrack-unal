import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { AVISO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { useMiRutina, type Rutina } from './api'
import { RutinaDias } from './RutinaDias'

const fechaLarga = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

/** Mi rutina vigente en el celular, para no depender de la hoja de papel (GYMM-22). */
export function MiRutinaPage() {
  const { data: rutina, isPending, isError, error, refetch } = useMiRutina()

  return (
    <Pantalla titulo="Mi rutina" estrecha>
      {isPending && (
        <p className="text-grafito" role="status">
          Cargando tu rutina…
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

      {rutina === null && (
        <div className={VACIO}>
          <p>Aún no tienes una rutina asignada.</p>
          <p className="mt-2 text-base text-grafito">
            Pídesela a tu instructor en el gimnasio. Cuando te la asigne, aparece aquí.
          </p>
        </div>
      )}

      {rutina && <DetalleRutina rutina={rutina} />}
    </Pantalla>
  )
}

function DetalleRutina({ rutina }: { rutina: Rutina }) {
  const dias = rutina.dias.map((d) => d.dia)
  const [dia, setDia] = useState(() => diaGuardado(rutina, dias))

  function elegir(nuevo: number) {
    setDia(nuevo)
    guardarDia(rutina.id, nuevo)
  }

  const delDia = { ...rutina, dias: rutina.dias.filter((d) => d.dia === dia) }

  return (
    <>
      <header>
        <h2 className="titular text-3xl">{rutina.nombre}</h2>
        {rutina.descripcion && <p className="mt-1 text-lg">{rutina.descripcion}</p>}
        <p className="mt-2 text-sm text-grafito">
          Te la asignó {rutina.instructor.nombres} {rutina.instructor.apellidos} el{' '}
          {fechaLarga.format(new Date(rutina.fechaAsignacion))}.
        </p>
      </header>

      {dias.length > 1 && (
        <div role="group" aria-label="Día de la rutina" className="mt-5 flex flex-wrap gap-2">
          {dias.map((d) => (
            <Chip key={d} activo={d === dia} onClick={() => elegir(d)}>
              {`Día ${d}`}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-6">
        <RutinaDias rutina={delDia} metodoSiempre />
      </div>
    </>
  )
}

// El día elegido se recuerda en este navegador: en el gimnasio la persona vuelve a la
// pantalla varias veces durante la sesión y espera seguir en el mismo día.
const claveDia = (rutinaId: string) => `gymtrack:mi-rutina:${rutinaId}:dia`

function diaGuardado(rutina: Rutina, dias: number[]): number {
  try {
    const guardado = Number(localStorage.getItem(claveDia(rutina.id)))
    if (dias.includes(guardado)) return guardado
  } catch {
    // Sin almacenamiento (modo privado, permisos): se empieza en el primer día.
  }
  return dias[0]
}

function guardarDia(rutinaId: string, dia: number) {
  try {
    localStorage.setItem(claveDia(rutinaId), String(dia))
  } catch {
    // No es grave: solo se pierde el recuerdo del día.
  }
}
