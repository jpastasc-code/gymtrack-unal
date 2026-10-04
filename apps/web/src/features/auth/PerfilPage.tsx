import { useState, type FormEvent } from 'react'
import { Boton } from '../../components/Boton'
import { Campo } from '../../components/Campo'
import { AVISO, AVISO_EXITO } from '../../components/estilos'
import { GrupoOpciones } from '../../components/GrupoOpciones'
import { Pantalla } from '../../components/Pantalla'
import { ApiError } from '../../lib/api/client'
import {
  OPCIONES_ACTIVIDAD,
  OPCIONES_OBJETIVO,
  OPCIONES_SEXO,
  useActualizarPerfil,
  usePerfil,
  type CambiosPerfil,
  type Perfil,
} from './perfil'
import { useSesion } from './sesion'
import { NOMBRE_ROL } from './tipos'

/** Consulta y edición del perfil (GYMM-11). */
export function PerfilPage() {
  const { cerrarSesion } = useSesion()
  const { data: perfil, isPending, isError, error, refetch } = usePerfil()

  return (
    <Pantalla titulo="Perfil" estrecha>
      {isPending && <p className="text-grafito" role="status">Cargando tu perfil…</p>}

      {isError && (
        <section className={AVISO} role="alert">
          <p className="font-medium text-alerta">{error.message}</p>
          <Boton variante="secundario" className="mt-4" onClick={() => void refetch()}>
            Intentar de nuevo
          </Boton>
        </section>
      )}

      {perfil && <FormularioPerfil perfil={perfil} />}

      <Boton variante="secundario" bloque className="mt-8" onClick={() => void cerrarSesion()}>
        Cerrar sesión
      </Boton>
    </Pantalla>
  )
}

type Formulario = Required<{ [K in keyof CambiosPerfil]: string }>

function aFormulario(p: Perfil): Formulario {
  return {
    nombres: p.nombres,
    apellidos: p.apellidos,
    telefono: p.telefono ?? '',
    fechaNacimiento: p.fechaNacimiento ?? '',
    sexo: p.sexo ?? '',
    objetivo: p.objetivo ?? '',
    nivelActividad: p.nivelActividad ?? '',
  }
}

/** Solo los campos que cambiaron; los vacíos se envían como null (borrar). */
function calcularCambios(original: Formulario, actual: Formulario): CambiosPerfil {
  const cambios: Record<string, string | null> = {}
  for (const clave of Object.keys(actual) as (keyof Formulario)[]) {
    if (actual[clave] !== original[clave]) {
      const valor = actual[clave].trim()
      cambios[clave] = valor === '' && clave !== 'nombres' && clave !== 'apellidos' ? null : valor
    }
  }
  return cambios as CambiosPerfil
}

function FormularioPerfil({ perfil }: { perfil: Perfil }) {
  // `original` sigue al servidor: tras guardar, el formulario coincide con él y no quedan cambios pendientes.
  const original = aFormulario(perfil)
  const [datos, setDatos] = useState<Formulario>(() => aFormulario(perfil))
  const [guardado, setGuardado] = useState(false)
  const actualizar = useActualizarPerfil()

  const cambios = calcularCambios(original, datos)
  const hayCambios = Object.keys(cambios).length > 0
  const erroresApi =
    actualizar.error instanceof ApiError
      ? ((actualizar.error.body as { errores?: Record<string, string> } | undefined)?.errores ?? {})
      : {}
  const errorGeneral = actualizar.error && Object.keys(erroresApi).length === 0 ? actualizar.error.message : null

  function cambiar<K extends keyof Formulario>(campo: K, valor: string) {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setGuardado(false)
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!hayCambios) return
    actualizar.mutate(cambios, { onSuccess: () => setGuardado(true) })
  }

  return (
    <>
      <section className="border-b border-linea pb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          {perfil.nombres} {perfil.apellidos}
        </h2>
        <p className="mt-2 inline-block rounded-full bg-hueso px-3 py-1 text-sm font-semibold">
          {NOMBRE_ROL[perfil.rol]}
        </p>
      </section>

      <section className="border-b border-linea py-6" aria-labelledby="titulo-institucional">
        <h2 id="titulo-institucional" className="titular text-3xl">
          Datos institucionales
        </h2>
        <dl className="mt-3">
          <div className="flex flex-col border-b border-linea py-2">
            <dt className="text-sm text-grafito">Documento</dt>
            <dd className="text-lg font-semibold">{perfil.documento}</dd>
          </div>
          <div className="flex flex-col py-2">
            <dt className="text-sm text-grafito">Correo</dt>
            <dd className="text-lg font-semibold break-all">{perfil.correo}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-grafito">
          Estos datos vienen de la universidad y no se pueden editar. Si hay un error, habla con el personal del gimnasio.
        </p>
      </section>

      <form className="mt-8 flex flex-col gap-10" onSubmit={guardar} noValidate>
        <section className="flex flex-col gap-5" aria-labelledby="titulo-personales">
          <h2 id="titulo-personales" className="titular text-3xl">
            Datos personales
          </h2>
          <Campo
            etiqueta="Nombres"
            autoComplete="given-name"
            value={datos.nombres}
            onChange={(e) => cambiar('nombres', e.target.value)}
            error={erroresApi.nombres}
          />
          <Campo
            etiqueta="Apellidos"
            autoComplete="family-name"
            value={datos.apellidos}
            onChange={(e) => cambiar('apellidos', e.target.value)}
            error={erroresApi.apellidos}
          />
          <Campo
            etiqueta="Teléfono"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+57 300 123 4567"
            value={datos.telefono}
            onChange={(e) => cambiar('telefono', e.target.value)}
            error={erroresApi.telefono}
          />
          <Campo
            etiqueta="Fecha de nacimiento"
            type="date"
            autoComplete="bday"
            value={datos.fechaNacimiento}
            onChange={(e) => cambiar('fechaNacimiento', e.target.value)}
            ayuda="Se usa para calcular tu requerimiento calórico."
            error={erroresApi.fechaNacimiento}
          />
          <GrupoOpciones
            leyenda="Sexo"
            nombre="sexo"
            forma="fila"
            opciones={OPCIONES_SEXO}
            valor={datos.sexo || null}
            onChange={(v) => cambiar('sexo', v)}
            error={erroresApi.sexo}
          />
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="titulo-entrenamiento">
          <h2 id="titulo-entrenamiento" className="titular text-3xl">
            Entrenamiento
          </h2>
          <GrupoOpciones
            leyenda="Objetivo"
            nombre="objetivo"
            opciones={OPCIONES_OBJETIVO}
            valor={datos.objetivo || null}
            onChange={(v) => cambiar('objetivo', v)}
            error={erroresApi.objetivo}
          />
          <GrupoOpciones
            leyenda="Nivel de actividad"
            nombre="nivelActividad"
            opciones={OPCIONES_ACTIVIDAD}
            valor={datos.nivelActividad || null}
            onChange={(v) => cambiar('nivelActividad', v)}
            error={erroresApi.nivelActividad}
          />
        </section>

        <div className="flex flex-col gap-3">
          {errorGeneral && (
            <p role="alert" className={`${AVISO} font-medium text-alerta`}>
              {errorGeneral}
            </p>
          )}
          {Object.keys(erroresApi).length > 0 && (
            <p role="alert" className="font-medium text-alerta">
              Revisa los campos marcados.
            </p>
          )}
          {guardado && !hayCambios && (
            <p role="status" className={AVISO_EXITO}>
              Cambios guardados.
            </p>
          )}
          <Boton type="submit" bloque grande disabled={!hayCambios || actualizar.isPending}>
            {actualizar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Boton>
        </div>
      </form>
    </>
  )
}
