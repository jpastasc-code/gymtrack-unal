import { useState, type FormEvent } from 'react'
import { Boton } from '../../components/Boton'
import { Campo } from '../../components/Campo'
import { Selector } from '../../components/Controles'
import { AVISO, AVISO_EXITO, VACIO } from '../../components/estilos'
import { Pantalla } from '../../components/Pantalla'
import { ApiError } from '../../lib/api/client'
import { NOMBRE_DIA, useCambiarFranja, useCrearFranja, useEliminarFranja, useFranjasCancha, type Franja } from './api'

const erroresDe = (error: unknown): Record<string, string> =>
  error instanceof ApiError ? ((error.body as { errores?: Record<string, string> } | undefined)?.errores ?? {}) : {}

const descripcion = (f: Pick<Franja, 'diaSemana' | 'horaInicio' | 'horaFin'>) =>
  `${NOMBRE_DIA[f.diaSemana].toLowerCase()} de ${f.horaInicio} a ${f.horaFin}`

/** El personal de deportes define las franjas semanales de la cancha (GYMM-20). */
export function FranjasCanchaPage() {
  const { data, isPending, isError, error, refetch } = useFranjasCancha()
  const [aviso, setAviso] = useState<string | null>(null)

  const dias = [1, 2, 3, 4, 5, 6, 7]
    .map((dia) => ({ dia, franjas: data?.franjas.filter((f) => f.diaSemana === dia) ?? [] }))
    .filter((d) => d.franjas.length > 0)

  return (
    <Pantalla titulo="Franjas de la cancha" volverA="/reservas/cancha" estrecha>
      <p className="text-lg text-grafito">
        Define en qué horarios se puede usar la cancha cada semana. Las franjas deshabilitadas no se muestran a los
        deportistas.
      </p>

      <section className="mt-6 border-t border-linea pt-6">
        <h2 className="titular text-3xl">Nueva franja</h2>
        <FormularioFranja onCreada={(f) => setAviso(`Franja agregada: ${descripcion(f)}.`)} />
      </section>

      {aviso && (
        <p role="status" className={`mt-6 ${AVISO_EXITO}`}>
          {aviso}
        </p>
      )}

      <section className="mt-8 border-t border-linea pt-6" aria-labelledby="titulo-horario">
        <h2 id="titulo-horario" className="titular text-3xl">
          Horario semanal
        </h2>

        {isPending && (
          <p className="mt-4 text-grafito" role="status">
            Cargando las franjas…
          </p>
        )}

        {isError && (
          <div role="alert" className={`mt-4 ${AVISO}`}>
            <p className="font-medium text-alerta">{error.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 font-semibold underline underline-offset-4">
              Intentar de nuevo
            </button>
          </div>
        )}

        {data && dias.length === 0 && (
          <div className={`mt-4 ${VACIO}`}>
            <p>Aún no hay franjas. Agrega la primera con el formulario de arriba.</p>
          </div>
        )}

        {dias.map(({ dia, franjas }) => (
          <div key={dia} className="mt-5">
            <h3 className="text-lg font-semibold">{NOMBRE_DIA[dia]}</h3>
            <ul aria-label={`Franjas del ${NOMBRE_DIA[dia].toLowerCase()}`} className="mt-2 border-t border-linea">
              {franjas.map((f) => (
                <li key={f.id} className="border-b border-linea">
                  <FilaFranja franja={f} onCambio={setAviso} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </Pantalla>
  )
}

function FormularioFranja({ onCreada }: { onCreada: (f: Franja) => void }) {
  const crear = useCrearFranja()
  const [dia, setDia] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [erroresLocales, setErroresLocales] = useState<Record<string, string>>({})

  const errores = { ...erroresDe(crear.error), ...erroresLocales }
  const errorGeneral = crear.error && Object.keys(erroresDe(crear.error)).length === 0 ? crear.error.message : null

  function agregar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const locales: Record<string, string> = {}
    if (!dia) locales.diaSemana = 'Elige un día de la semana.'
    if (!inicio) locales.horaInicio = 'Escribe la hora de inicio.'
    if (!fin) locales.horaFin = 'Escribe la hora de fin.'
    else if (inicio && fin <= inicio) locales.horaFin = 'La hora de fin debe ser posterior a la de inicio.'
    setErroresLocales(locales)
    crear.reset()
    if (Object.keys(locales).length > 0) return
    crear.mutate(
      { diaSemana: Number(dia), horaInicio: inicio, horaFin: fin },
      {
        onSuccess: (franja) => {
          onCreada(franja)
          // Lo más común es seguir con la franja siguiente del mismo día.
          setInicio(fin)
          setFin('')
        },
      },
    )
  }

  return (
    <form className="mt-4 flex flex-col gap-5" onSubmit={agregar} noValidate>
      <Selector
        etiqueta="Día"
        value={dia}
        onChange={(e) => setDia(e.target.value)}
        opciones={[{ valor: '', nombre: 'Elige un día' }, ...[1, 2, 3, 4, 5, 6, 7].map((d) => ({ valor: String(d), nombre: NOMBRE_DIA[d] }))]}
        error={errores.diaSemana}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Desde" type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} error={errores.horaInicio} />
        <Campo etiqueta="Hasta" type="time" value={fin} onChange={(e) => setFin(e.target.value)} error={errores.horaFin} />
      </div>
      {errorGeneral && (
        <p role="alert" className="rounded-xl bg-hueso p-4 font-medium text-alerta">
          {errorGeneral}
        </p>
      )}
      <Boton type="submit" bloque grande disabled={crear.isPending}>
        {crear.isPending ? 'Agregando…' : 'Agregar franja'}
      </Boton>
    </form>
  )
}

function FilaFranja({ franja: f, onCambio }: { franja: Franja; onCambio: (aviso: string) => void }) {
  const cambiar = useCambiarFranja()
  const eliminar = useEliminarFranja()
  const [confirmando, setConfirmando] = useState(false)
  const horario = `${f.horaInicio}–${f.horaFin}`
  const error = cambiar.error ?? eliminar.error

  if (confirmando) {
    return (
      <div role="alertdialog" aria-label={`Eliminar la franja del ${descripcion(f)}`} className="py-4">
        <p className="font-semibold">¿Eliminar la franja del {descripcion(f)}?</p>
        <p className="mt-1 text-sm text-grafito">Las reservas que ya existan en ese horario se conservan.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Boton
            disabled={eliminar.isPending}
            onClick={() =>
              eliminar.mutate(f.id, {
                onSuccess: () => onCambio(`Franja eliminada: ${descripcion(f)}.`),
                onSettled: () => setConfirmando(false),
              })
            }
          >
            {eliminar.isPending ? 'Eliminando…' : 'Sí, eliminar'}
          </Boton>
          <Boton variante="texto" onClick={() => setConfirmando(false)}>
            Cancelar
          </Boton>
        </div>
      </div>
    )
  }

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="flex-1 text-lg font-semibold">
          {horario}
          {!f.activa && (
            <span className="ml-2 rounded-full border border-borde-control px-2.5 py-0.5 align-middle text-xs font-semibold text-grafito">
              Deshabilitada
            </span>
          )}
        </p>
        <div className="flex gap-1">
          <Boton
            variante="texto"
            aria-label={`${f.activa ? 'Deshabilitar' : 'Habilitar'} ${descripcion(f)}`}
            disabled={cambiar.isPending}
            onClick={() =>
              cambiar.mutate(
                { id: f.id, activa: !f.activa },
                { onSuccess: () => onCambio(`Franja ${f.activa ? 'deshabilitada' : 'habilitada'}: ${descripcion(f)}.`) },
              )
            }
          >
            {f.activa ? 'Deshabilitar' : 'Habilitar'}
          </Boton>
          <Boton variante="texto" aria-label={`Eliminar ${descripcion(f)}`} onClick={() => setConfirmando(true)}>
            Eliminar
          </Boton>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-alerta">
          {error.message}
        </p>
      )}
    </div>
  )
}
