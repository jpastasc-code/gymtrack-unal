import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Boton } from '../../../components/Boton'
import { Campo } from '../../../components/Campo'
import { AreaTexto, Selector } from '../../../components/Controles'
import { Pantalla } from '../../../components/Pantalla'
import { ApiError } from '../../../lib/api/client'
import {
  GRUPOS,
  useActualizarEjercicio,
  useCrearEjercicio,
  useEjercicio,
  useEliminarEjercicio,
  type Ejercicio,
  type GrupoMuscular,
} from './api'

const erroresDe = (error: unknown): Record<string, string> =>
  error instanceof ApiError ? ((error.body as { errores?: Record<string, string> } | undefined)?.errores ?? {}) : {}

/** Agregar un ejercicio al catálogo (instructores). */
export function NuevoEjercicioPage() {
  const navigate = useNavigate()
  const crear = useCrearEjercicio()
  return (
    <Pantalla titulo="Nuevo ejercicio" volverA="/ejercicios" estrecha>
      <FormularioEjercicio
        textoGuardar="Agregar al catálogo"
        guardando={crear.isPending}
        error={crear.error}
        onGuardar={(datos) => crear.mutate(datos, { onSuccess: () => void navigate('/ejercicios') })}
      />
    </Pantalla>
  )
}

/** Editar, desactivar o eliminar un ejercicio (instructores). */
export function EditarEjercicioPage() {
  const { id = '' } = useParams()
  const { data: ejercicio, isPending, isError, error } = useEjercicio(id)

  return (
    <Pantalla titulo="Editar ejercicio" volverA="/ejercicios" estrecha>
      {isPending && <p className="text-grafito" role="status">Cargando ejercicio…</p>}
      {isError && (
        <p role="alert" className="rounded-xl bg-hueso p-5 font-medium text-alerta">
          {error.message}
        </p>
      )}
      {ejercicio && <EdicionEjercicio ejercicio={ejercicio} />}
    </Pantalla>
  )
}

function EdicionEjercicio({ ejercicio }: { ejercicio: Ejercicio }) {
  const navigate = useNavigate()
  const actualizar = useActualizarEjercicio(ejercicio.id)
  const eliminar = useEliminarEjercicio(ejercicio.id)
  const [confirmando, setConfirmando] = useState(false)
  const confirmacion = useRef<HTMLDivElement>(null)
  const volver = () => void navigate('/ejercicios')

  // Al abrir la confirmación, el foco va a ella: queda a la vista (sobre la barra inferior) y el lector de pantalla la anuncia.
  useEffect(() => {
    if (confirmando) confirmacion.current?.focus()
  }, [confirmando])

  return (
    <>
      {!ejercicio.activo && (
        <p className="mb-5 rounded-xl bg-hueso p-4 text-grafito">
          Este ejercicio está desactivado: no aparece en el catálogo ni se puede agregar a rutinas nuevas.
        </p>
      )}
      <FormularioEjercicio
        inicial={ejercicio}
        textoGuardar="Guardar cambios"
        guardando={actualizar.isPending}
        error={actualizar.error}
        onGuardar={(datos) => actualizar.mutate(datos, { onSuccess: volver })}
      />

      <section className="mt-10 flex flex-col gap-3 border-t border-linea pt-6" aria-label="Otras acciones">
        <Boton
          variante="secundario"
          bloque
          disabled={actualizar.isPending}
          onClick={() => actualizar.mutate({ activo: !ejercicio.activo }, { onSuccess: volver })}
        >
          {ejercicio.activo ? 'Desactivar ejercicio' : 'Activar ejercicio'}
        </Boton>
        <p className="text-sm text-grafito">
          Desactivar lo oculta del catálogo sin borrarlo de las rutinas ni del historial de entrenamiento.
        </p>

        {!confirmando ? (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="mt-2 min-h-11 self-start font-semibold text-alerta underline underline-offset-4"
          >
            Eliminar ejercicio
          </button>
        ) : (
          <div
            ref={confirmacion}
            tabIndex={-1}
            role="alertdialog"
            aria-labelledby="titulo-eliminar"
            className="mt-2 scroll-mb-28 rounded-xl bg-hueso p-5 focus:outline-3 focus:outline-offset-2 focus:outline-negro"
          >
            <p id="titulo-eliminar" className="font-semibold">
              ¿Eliminar “{ejercicio.nombre}”? Esta acción no se puede deshacer.
            </p>
            {eliminar.error && <p className="mt-2 text-sm font-medium text-alerta">{eliminar.error.message}</p>}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={eliminar.isPending}
                onClick={() => eliminar.mutate(undefined, { onSuccess: volver })}
                className="min-h-11 rounded-full bg-alerta px-6 font-semibold text-blanco disabled:opacity-50"
              >
                {eliminar.isPending ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <Boton
                variante="secundario"
                onClick={() => {
                  setConfirmando(false)
                  eliminar.reset()
                }}
              >
                Cancelar
              </Boton>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

interface PropsFormulario {
  inicial?: Ejercicio
  textoGuardar: string
  guardando: boolean
  error: Error | null
  onGuardar: (datos: { nombre: string; grupoMuscular: GrupoMuscular; descripcion: string | null }) => void
}

function FormularioEjercicio({ inicial, textoGuardar, guardando, error, onGuardar }: PropsFormulario) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [grupo, setGrupo] = useState<GrupoMuscular | ''>(inicial?.grupoMuscular ?? '')
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '')
  const [erroresLocales, setErroresLocales] = useState<Record<string, string>>({})

  const errores = { ...erroresDe(error), ...erroresLocales }
  const errorGeneral = error && Object.keys(erroresDe(error)).length === 0 ? error.message : null

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const locales: Record<string, string> = {}
    if (nombre.trim().length < 3) locales.nombre = 'El nombre debe tener al menos 3 caracteres.'
    if (!grupo) locales.grupoMuscular = 'Elige un grupo muscular.'
    setErroresLocales(locales)
    if (Object.keys(locales).length > 0 || !grupo) return
    onGuardar({ nombre: nombre.trim(), grupoMuscular: grupo, descripcion: descripcion.trim() || null })
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={guardar} noValidate>
      <Campo
        etiqueta="Nombre"
        value={nombre}
        maxLength={100}
        placeholder="Sentadilla búlgara"
        onChange={(e) => setNombre(e.target.value)}
        error={errores.nombre}
      />
      <Selector
        etiqueta="Grupo muscular"
        value={grupo}
        onChange={(e) => setGrupo(e.target.value as GrupoMuscular)}
        opciones={[{ valor: '', nombre: 'Elige un grupo' }, ...GRUPOS.map((g) => ({ valor: g.valor, nombre: g.nombre }))]}
        error={errores.grupoMuscular}
      />
      <AreaTexto
        etiqueta="Descripción (opcional)"
        value={descripcion}
        maxLength={1000}
        placeholder="Cómo se ejecuta y en qué fijarse."
        onChange={(e) => setDescripcion(e.target.value)}
        ayuda="Los deportistas la ven en el catálogo y en su rutina."
        error={errores.descripcion}
      />
      {errorGeneral && (
        <p role="alert" className="rounded-xl bg-hueso p-4 font-medium text-alerta">
          {errorGeneral}
        </p>
      )}
      <Boton type="submit" bloque grande disabled={guardando}>
        {guardando ? 'Guardando…' : textoGuardar}
      </Boton>
    </form>
  )
}
