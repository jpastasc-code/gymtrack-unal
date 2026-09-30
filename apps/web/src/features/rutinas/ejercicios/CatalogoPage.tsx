import { Link } from 'react-router'
import { useState } from 'react'
import { IconoFlecha } from '../../../components/iconos'
import { Pantalla } from '../../../components/Pantalla'
import { useRetardado } from '../../../lib/useRetardado'
import { useSesion } from '../../auth/sesion'
import { GRUPOS, NOMBRE_GRUPO, ROLES_EDITORES, useEjercicios, type Ejercicio, type GrupoMuscular } from './api'

/** Catálogo de ejercicios (GYMM-12): todos lo consultan, los instructores lo editan. */
export function CatalogoPage() {
  const { perfil } = useSesion()
  const puedeEditar = !!perfil && (ROLES_EDITORES as readonly string[]).includes(perfil.rol)

  const [texto, setTexto] = useState('')
  const [grupo, setGrupo] = useState<GrupoMuscular | null>(null)
  const [verDesactivados, setVerDesactivados] = useState(false)
  const q = useRetardado(texto)
  const { data: ejercicios, isPending, isError, error, refetch, isPlaceholderData } = useEjercicios({
    q,
    grupo,
    incluirInactivos: puedeEditar && verDesactivados,
  })

  const hayFiltros = texto.trim() !== '' || grupo !== null

  return (
    <Pantalla titulo="Ejercicios" volverA="/">
      {puedeEditar && (
        <Link
          to="/ejercicios/nuevo"
          className="mb-5 flex min-h-14 items-center justify-center rounded-xl bg-campus px-5 text-lg font-semibold text-concreto hover:bg-campus-oscuro"
        >
          Agregar ejercicio
        </Link>
      )}

      <label htmlFor="buscar-ejercicio" className="sr-only">
        Buscar ejercicio
      </label>
      <input
        id="buscar-ejercicio"
        type="search"
        placeholder="Buscar por nombre o descripción"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="min-h-12 w-full rounded-xl border-2 border-borde-control bg-superficie px-4 text-lg placeholder:text-gris focus:border-campus focus:outline-3 focus:outline-offset-2 focus:outline-campus"
      />

      <div
        role="group"
        aria-label="Filtrar por grupo muscular"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"
      >
        <Chip activo={grupo === null} onClick={() => setGrupo(null)}>
          Todos
        </Chip>
        {GRUPOS.map((g) => (
          <Chip key={g.valor} activo={grupo === g.valor} onClick={() => setGrupo(grupo === g.valor ? null : g.valor)}>
            {g.nombre}
          </Chip>
        ))}
      </div>

      {puedeEditar && (
        <label className="mt-2 flex min-h-11 items-center gap-3 text-gris">
          <input
            type="checkbox"
            checked={verDesactivados}
            onChange={(e) => setVerDesactivados(e.target.checked)}
            className="size-5 accent-campus"
          />
          Mostrar ejercicios desactivados
        </label>
      )}

      <div className="mt-3" aria-busy={isPlaceholderData}>
        {isPending && <p className="text-gris" role="status">Cargando ejercicios…</p>}

        {isError && (
          <div role="alert" className="rounded-2xl bg-superficie p-5">
            <p className="font-medium text-alerta">{error.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 font-semibold text-campus underline">
              Intentar de nuevo
            </button>
          </div>
        )}

        {ejercicios && (
          <>
            <p className="mb-2 text-sm text-gris" role="status">
              {ejercicios.length === 1 ? '1 ejercicio' : `${ejercicios.length} ejercicios`}
              {grupo ? ` de ${NOMBRE_GRUPO[grupo].toLowerCase()}` : ''}
            </p>
            {ejercicios.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-linea bg-superficie p-5">
                <p className="text-lg">
                  {hayFiltros ? 'Ningún ejercicio coincide con la búsqueda.' : 'El catálogo aún no tiene ejercicios.'}
                </p>
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={() => {
                      setTexto('')
                      setGrupo(null)
                    }}
                    className="mt-3 min-h-11 font-semibold text-campus underline"
                  >
                    Quitar filtros
                  </button>
                )}
              </div>
            ) : (
              <ul aria-label="Ejercicios del catálogo" className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
                {ejercicios.map((e) => (
                  <li key={e.id}>
                    <FilaEjercicio ejercicio={e} editable={puedeEditar} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Pantalla>
  )
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border-2 px-4 font-semibold whitespace-nowrap ${
        activo ? 'border-campus bg-campus text-concreto' : 'border-borde-control bg-superficie text-tinta'
      }`}
    >
      {children}
    </button>
  )
}

function FilaEjercicio({ ejercicio: e, editable }: { ejercicio: Ejercicio; editable: boolean }) {
  const contenido = (
    <div className="flex-1">
      <p className="text-lg font-semibold">{e.nombre}</p>
      <p className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-campus-claro px-2.5 py-0.5 text-xs font-semibold text-campus-oscuro">
          {NOMBRE_GRUPO[e.grupoMuscular]}
        </span>
        {!e.activo && (
          <span className="rounded-full border border-borde-control px-2.5 py-0.5 text-xs font-semibold text-gris">
            Desactivado
          </span>
        )}
      </p>
      {e.descripcion && <p className="mt-1 text-sm text-gris">{e.descripcion}</p>}
    </div>
  )

  if (!editable) return <div className="px-5 py-4">{contenido}</div>
  return (
    <Link
      to={`/ejercicios/${e.id}/editar`}
      className="flex items-center gap-3 px-5 py-4 hover:bg-campus-claro"
      aria-label={`Editar ${e.nombre}`}
    >
      {contenido}
      <IconoFlecha className="shrink-0 text-campus" />
    </Link>
  )
}
