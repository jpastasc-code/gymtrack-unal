import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Boton } from '../../../components/Boton'
import { Campo } from '../../../components/Campo'
import { AreaTexto, Selector } from '../../../components/Controles'
import { BUSCADOR, VACIO } from '../../../components/estilos'
import { Pantalla } from '../../../components/Pantalla'
import { ApiError } from '../../../lib/api/client'
import { useRetardado } from '../../../lib/useRetardado'
import { useDeportista } from '../../evaluacion/api'
import { MAX_DIAS, METODOS, useAsignarRutina, useRutinasDeportista, type Metodo, type Rutina } from '../api'
import { NOMBRE_GRUPO, useEjercicios, type Ejercicio, type GrupoMuscular } from '../ejercicios/api'
import { FiltroGrupos } from '../ejercicios/FiltroGrupos'

interface Fila {
  clave: string
  ejercicio: Pick<Ejercicio, 'id' | 'nombre' | 'grupoMuscular'>
  series: string
  repeticiones: string
  metodo: Metodo
  descanso: string
}
type Valores = Pick<Fila, 'series' | 'repeticiones' | 'metodo' | 'descanso'>

/** Lo que indica la ficha del gimnasio para casi todos los ejercicios: 3 × 10-12. */
const VALORES_INICIALES: Valores = { series: '3', repeticiones: '10-12', metodo: 'TRADICIONAL', descanso: '' }

let contador = 0
const nuevaClave = () => `fila-${++contador}`

const filasDe = (rutina: Rutina): Fila[][] =>
  rutina.dias.map((d) =>
    d.ejercicios.map((e) => ({
      clave: nuevaClave(),
      ejercicio: e.ejercicio,
      series: String(e.series),
      repeticiones: e.repeticionesObjetivo,
      metodo: e.metodo,
      descanso: e.descansoSegundos === null ? '' : String(e.descansoSegundos),
    })),
  )

/** Campos del API (`ejercicios.<i>.<campo>`) → campos de la tarjeta del ejercicio. */
const CAMPO_LOCAL: Record<string, string> = {
  series: 'series',
  repeticionesObjetivo: 'repeticiones',
  descansoSegundos: 'descanso',
  metodo: 'metodo',
  ejercicioId: 'ejercicio',
  dia: 'ejercicio',
}

/** Paso 2 de GYMM-21: armar la rutina por días con ejercicios del catálogo y asignarla. */
export function NuevaRutinaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const deportista = useDeportista(id)
  const rutinas = useRutinasDeportista(id)
  const asignar = useAsignarRutina(id)
  const vigente = rutinas.data?.find((r) => r.vigente)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [dias, setDias] = useState<Fila[][]>([[]])
  const [eligiendoEn, setEligiendoEn] = useState<number | null>(null)
  const [erroresLocales, setErroresLocales] = useState<Record<string, string>>({})
  const [enviadas, setEnviadas] = useState<string[]>([])
  const aviso = useRef<HTMLParagraphElement>(null)
  const formulario = useRef<HTMLFormElement>(null)

  const erroresApi = useMemo(() => {
    const error = asignar.error
    if (!error) return {}
    const delApi = error instanceof ApiError ? ((error.body as { errores?: Record<string, string> } | undefined)?.errores ?? {}) : {}
    const traducidos: Record<string, string> = {}
    for (const [campo, mensaje] of Object.entries(delApi)) {
      const [, indice, propio] = campo.match(/^ejercicios\.(\d+)\.(\w+)$/) ?? []
      const clave = indice === undefined ? undefined : enviadas[Number(indice)]
      if (clave) traducidos[`${clave}.${CAMPO_LOCAL[propio] ?? 'ejercicio'}`] = mensaje
      else traducidos[campo === 'nombre' || campo === 'descripcion' ? campo : 'general'] = mensaje
    }
    return Object.keys(traducidos).length ? traducidos : { general: error.message }
  }, [asignar.error, enviadas])
  const errores: Record<string, string> = { ...erroresApi, ...erroresLocales }
  const hayErrores = Object.keys(errores).length > 0

  // Tras un intento fallido, el foco va al primer campo con error; si no es de un campo, al aviso.
  useEffect(() => {
    if (!hayErrores) return
    const campo = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    ;(campo ?? aviso.current)?.focus()
  }, [hayErrores, erroresApi, erroresLocales])

  const todas = dias.flat()

  function agregar(dia: number, ejercicio: Ejercicio) {
    // Cada ejercicio nuevo parte de los valores del anterior: la ficha suele repetir "3 × 10-12".
    const ultimo = todas.at(-1)
    const valores: Valores = ultimo
      ? { series: ultimo.series, repeticiones: ultimo.repeticiones, metodo: ultimo.metodo, descanso: ultimo.descanso }
      : VALORES_INICIALES
    const fila: Fila = { clave: nuevaClave(), ejercicio, ...valores }
    setDias((ds) => ds.map((d, i) => (i === dia ? [...d, fila] : d)))
  }

  function cambiar(clave: string, campo: keyof Valores, valor: string) {
    setDias((ds) => ds.map((d) => d.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f))))
  }

  function quitar(clave: string) {
    setDias((ds) => ds.map((d) => d.filter((f) => f.clave !== clave)))
  }

  function mover(dia: number, indice: number, delta: -1 | 1) {
    setDias((ds) =>
      ds.map((d, i) => {
        if (i !== dia) return d
        const copia = [...d]
        ;[copia[indice], copia[indice + delta]] = [copia[indice + delta], copia[indice]]
        return copia
      }),
    )
  }

  function agregarDia() {
    setEligiendoEn(dias.length)
    setDias((ds) => [...ds, []])
  }

  function quitarDia(dia: number) {
    const filas = dias[dia]
    if (filas.length > 0 && !window.confirm(`¿Quitar el día ${dia + 1} con sus ${filas.length} ejercicios?`)) return
    setEligiendoEn(null)
    setDias((ds) => ds.filter((_, i) => i !== dia))
  }

  function copiarVigente(rutina: Rutina) {
    setEligiendoEn(null)
    setDias(filasDe(rutina))
    if (!descripcion.trim()) setDescripcion(rutina.descripcion ?? '')
  }

  function validar(): Record<string, string> {
    const e: Record<string, string> = {}
    if (nombre.trim().length < 3) e.nombre = 'Escribe un nombre de al menos 3 caracteres.'
    dias.forEach((d, i) => {
      if (d.length === 0) e[`dia.${i}`] = `Agrega al menos un ejercicio al día ${i + 1} o quítalo.`
    })
    for (const f of todas) {
      const series = Number(f.series)
      if (!/^\d+$/.test(f.series.trim()) || series < 1 || series > 20) e[`${f.clave}.series`] = 'Entre 1 y 20.'
      if (!f.repeticiones.trim()) e[`${f.clave}.repeticiones`] = 'Indica las repeticiones.'
      else if (f.repeticiones.trim().length > 30) e[`${f.clave}.repeticiones`] = 'Máximo 30 caracteres.'
      const descanso = f.descanso.trim()
      if (descanso && (!/^\d+$/.test(descanso) || Number(descanso) > 600)) e[`${f.clave}.descanso`] = 'Entre 0 y 600 s.'
    }
    return e
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados = validar()
    setErroresLocales(encontrados)
    if (Object.keys(encontrados).length > 0) return
    const filas = dias.flatMap((d, i) => d.map((f) => ({ f, dia: i + 1 })))
    setEnviadas(filas.map(({ f }) => f.clave))
    asignar.mutate(
      {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        ejercicios: filas.map(({ f, dia }) => ({
          ejercicioId: f.ejercicio.id,
          dia,
          series: Number(f.series),
          repeticionesObjetivo: f.repeticiones.trim(),
          metodo: f.metodo,
          descansoSegundos: f.descanso.trim() === '' ? null : Number(f.descanso),
        })),
      },
      { onSuccess: () => void navigate(`/rutinas/${id}`, { state: { asignada: true } }) },
    )
  }

  const numErrores = Object.keys(errores).filter((k) => k !== 'general').length
  const nombreDeportista = deportista.data ? `${deportista.data.nombres} ${deportista.data.apellidos}` : ''

  return (
    <Pantalla titulo="Nueva rutina" volverA={`/rutinas/${id}`} estrecha>
      {deportista.data && <p className="-mt-3 mb-5 text-lg text-grafito">Para {nombreDeportista}</p>}

      <form ref={formulario} className="flex flex-col gap-8" onSubmit={guardar} noValidate>
        {vigente && todas.length === 0 && (
          <div className="rounded-xl bg-hueso p-4">
            <p>
              Su rutina vigente es <strong>{vigente.nombre}</strong>. Puedes partir de ella y cambiar solo lo necesario.
            </p>
            <Boton variante="secundario" className="mt-3" onClick={() => copiarVigente(vigente)}>
              Copiar rutina vigente
            </Boton>
          </div>
        )}

        <section className="flex flex-col gap-5" aria-label="Datos de la rutina">
          <Campo
            etiqueta="Nombre de la rutina"
            placeholder="Ej.: Fase 1 – 3 días"
            maxLength={100}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={errores.nombre}
          />
          <AreaTexto
            etiqueta="Indicaciones generales (opcional)"
            rows={2}
            maxLength={1000}
            placeholder="Ej.: calentar 10 minutos; core al final de cada día."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            error={errores.descripcion}
          />
        </section>

        {dias.map((filas, dia) => (
          <section key={dia} className="flex flex-col gap-3" aria-labelledby={`titulo-dia-${dia}`}>
            <div className="flex items-center justify-between gap-3 border-t-2 border-negro pt-4">
              <h2 id={`titulo-dia-${dia}`} className="titular text-4xl">
                Día {dia + 1}
              </h2>
              {dias.length > 1 && (
                <Boton variante="texto" onClick={() => quitarDia(dia)} aria-label={`Quitar día ${dia + 1}`}>
                  Quitar día
                </Boton>
              )}
            </div>
            {errores[`dia.${dia}`] && <p className="text-sm font-medium text-alerta">{errores[`dia.${dia}`]}</p>}

            {filas.length === 0 && eligiendoEn !== dia && <p className={VACIO}>Aún no tiene ejercicios.</p>}
            {filas.length > 0 && (
              <ol aria-label={`Ejercicios del día ${dia + 1}`} className="flex flex-col gap-3">
                {filas.map((f, i) => (
                  <TarjetaEjercicio
                    key={f.clave}
                    fila={f}
                    posicion={i + 1}
                    dia={dia + 1}
                    errores={errores}
                    acciones={
                      <>
                        <BotonIcono etiqueta={`Subir ${f.ejercicio.nombre}`} disabled={i === 0} onClick={() => mover(dia, i, -1)}>
                          ↑
                        </BotonIcono>
                        <BotonIcono
                          etiqueta={`Bajar ${f.ejercicio.nombre}`}
                          disabled={i === filas.length - 1}
                          onClick={() => mover(dia, i, 1)}
                        >
                          ↓
                        </BotonIcono>
                        <BotonIcono etiqueta={`Quitar ${f.ejercicio.nombre}`} onClick={() => quitar(f.clave)}>
                          ✕
                        </BotonIcono>
                      </>
                    }
                    onCambiar={(campo, valor) => cambiar(f.clave, campo, valor)}
                  />
                ))}
              </ol>
            )}

            {eligiendoEn === dia ? (
              <ElegirEjercicios
                dia={dia + 1}
                elegidos={new Set(filas.map((f) => f.ejercicio.id))}
                onElegir={(e) => agregar(dia, e)}
                onCerrar={() => setEligiendoEn(null)}
              />
            ) : (
              <Boton variante="secundario" onClick={() => setEligiendoEn(dia)} aria-label={`Agregar ejercicio al día ${dia + 1}`}>
                Agregar ejercicio
              </Boton>
            )}
          </section>
        ))}

        {dias.length < MAX_DIAS && (
          <Boton variante="secundario" bloque onClick={agregarDia}>
            Agregar día {dias.length + 1}
          </Boton>
        )}

        <div className="flex flex-col gap-3">
          {(numErrores > 0 || errores.general) && (
            <p ref={aviso} tabIndex={-1} role="alert" className="rounded-xl bg-hueso p-4 font-medium text-alerta focus:outline-none">
              {errores.general ??
                (numErrores === 1 ? 'Revisa el campo marcado.' : `Revisa los ${numErrores} campos marcados.`)}
            </p>
          )}
          <p className="text-sm text-grafito">
            {vigente
              ? `Al asignarla, «${vigente.nombre}» deja de estar vigente y ${deportista.data?.nombres ?? 'el deportista'} verá la nueva en su celular.`
              : `${deportista.data?.nombres ?? 'El deportista'} la verá en su celular apenas la asignes.`}
          </p>
          <Boton type="submit" bloque grande disabled={asignar.isPending}>
            {asignar.isPending ? 'Asignando…' : 'Asignar rutina'}
          </Boton>
        </div>
      </form>
    </Pantalla>
  )
}

interface PropsTarjeta {
  fila: Fila
  posicion: number
  dia: number
  errores: Record<string, string>
  acciones: ReactNode
  onCambiar: (campo: keyof Valores, valor: string) => void
}

function TarjetaEjercicio({ fila: f, posicion, dia, errores, acciones, onCambiar }: PropsTarjeta) {
  const de = `de ${f.ejercicio.nombre}, día ${dia}`
  const error = (campo: string) => errores[`${f.clave}.${campo}`]
  return (
    <li className="rounded-xl border border-linea p-4">
      <div className="flex items-start gap-2">
        <span className="titular w-6 shrink-0 text-2xl text-grafito" aria-hidden="true">
          {posicion}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-semibold">{f.ejercicio.nombre}</p>
          <p className="text-sm text-grafito">{NOMBRE_GRUPO[f.ejercicio.grupoMuscular]}</p>
          {error('ejercicio') && <p className="mt-1 text-sm font-medium text-alerta">{error('ejercicio')}</p>}
        </div>
        <div className="-mt-1 -mr-2 flex shrink-0">{acciones}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 md:grid-cols-4">
        <Campo
          etiqueta="Series"
          aria-label={`Series ${de}`}
          inputMode="numeric"
          value={f.series}
          onChange={(e) => onCambiar('series', e.target.value)}
          error={error('series')}
        />
        <Campo
          etiqueta="Repeticiones"
          aria-label={`Repeticiones ${de}`}
          placeholder="10-12"
          maxLength={30}
          value={f.repeticiones}
          onChange={(e) => onCambiar('repeticiones', e.target.value)}
          error={error('repeticiones')}
        />
        <Selector
          etiqueta="Método"
          aria-label={`Método ${de}`}
          value={f.metodo}
          onChange={(e) => onCambiar('metodo', e.target.value)}
          opciones={METODOS}
          error={error('metodo')}
        />
        <Campo
          etiqueta="Descanso"
          aria-label={`Descanso ${de}`}
          inputMode="numeric"
          unidad="s"
          placeholder="Opcional"
          value={f.descanso}
          onChange={(e) => onCambiar('descanso', e.target.value)}
          error={error('descanso')}
        />
      </div>
    </li>
  )
}

function BotonIcono({ etiqueta, children, ...resto }: { etiqueta: string; children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      className="grid size-11 place-items-center rounded-full text-xl text-negro hover:bg-hueso disabled:opacity-30 disabled:hover:bg-transparent"
      {...resto}
    >
      {children}
    </button>
  )
}

interface PropsElegir {
  dia: number
  elegidos: Set<string>
  onElegir: (ejercicio: Ejercicio) => void
  onCerrar: () => void
}

/** Busca en el catálogo y agrega ejercicios al día; se queda abierto para agregar varios seguidos. */
function ElegirEjercicios({ dia, elegidos, onElegir, onCerrar }: PropsElegir) {
  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState<GrupoMuscular | null>(null)
  const q = useRetardado(texto)
  const { data: ejercicios, isPending, isError, error } = useEjercicios({ q, grupo, incluirInactivos: false })

  return (
    <div role="group" aria-label={`Agregar ejercicios al día ${dia}`} className="rounded-xl border-2 border-negro p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold">Agregar al día {dia}</p>
        <Boton variante="texto" onClick={onCerrar}>
          Listo
        </Boton>
      </div>
      <label htmlFor={`buscar-ejercicio-dia-${dia}`} className="sr-only">
        Buscar ejercicio
      </label>
      <input
        id={`buscar-ejercicio-dia-${dia}`}
        type="search"
        placeholder="Buscar en el catálogo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={BUSCADOR}
      />
      <FiltroGrupos valor={grupo} onChange={setGrupo} margen="tarjeta" className="mt-3" />

      {isPending && <p className="mt-3 text-grafito" role="status">Cargando ejercicios…</p>}
      {isError && <p role="alert" className="mt-3 font-medium text-alerta">{error.message}</p>}
      {ejercicios?.length === 0 && <p className="mt-3 text-grafito">Ningún ejercicio coincide con la búsqueda.</p>}
      {ejercicios && ejercicios.length > 0 && (
        <ul aria-label="Ejercicios del catálogo" className="mt-2 max-h-80 divide-y divide-linea overflow-y-auto border-y border-linea">
          {ejercicios.map((e) => {
            const ya = elegidos.has(e.id)
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={ya}
                  onClick={() => onElegir(e)}
                  aria-label={ya ? `${e.nombre} ya está en el día ${dia}` : `Agregar ${e.nombre}`}
                  className="flex min-h-13 w-full items-center gap-3 py-2 text-left hover:bg-hueso disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="flex-1">
                    <span className="block font-semibold">{e.nombre}</span>
                    <span className="block text-sm text-grafito">{NOMBRE_GRUPO[e.grupoMuscular]}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${ya ? 'text-verde-tinta' : 'underline underline-offset-4'}`}>
                    {ya ? 'Agregado' : 'Agregar'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
