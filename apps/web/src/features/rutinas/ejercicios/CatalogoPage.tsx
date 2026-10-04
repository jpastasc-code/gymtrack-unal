import { Link } from 'react-router'
import { useState } from 'react'
import { AVISO, BUSCADOR, ENLACE_PRIMARIO, VACIO } from '../../../components/estilos'
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
        <Link to="/ejercicios/nuevo" className={`mb-6 ${ENLACE_PRIMARIO} md:w-fit`}>
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
        className={`${BUSCADOR} md:max-w-xl`}
      />

      <div
        role="group"
        aria-label="Filtrar por grupo muscular"
        className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
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
        <label className="mt-2 flex min-h-11 items-center gap-3 text-grafito">
          <input
            type="checkbox"
            checked={verDesactivados}
            onChange={(e) => setVerDesactivados(e.target.checked)}
            className="size-5 accent-negro"
          />
          Mostrar ejercicios desactivados
        </label>
      )}

      <div className="mt-4" aria-busy={isPlaceholderData}>
        {isPending && <p className="text-grafito" role="status">Cargando ejercicios…</p>}

        {isError && (
          <div role="alert" className={AVISO}>
            <p className="font-medium text-alerta">{error.message}</p>
            <button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 font-semibold underline underline-offset-4">
              Intentar de nuevo
            </button>
          </div>
        )}

        {ejercicios && (
          <>
            <p className="mb-3 text-sm text-grafito" role="status">
              {ejercicios.length === 1 ? '1 ejercicio' : `${ejercicios.length} ejercicios`}
              {grupo ? ` de ${NOMBRE_GRUPO[grupo].toLowerCase()}` : ''}
            </p>
            {ejercicios.length === 0 ? (
              <div className={VACIO}>
                <p>
                  {hayFiltros ? 'Ningún ejercicio coincide con la búsqueda.' : 'El catálogo aún no tiene ejercicios.'}
                </p>
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={() => {
                      setTexto('')
                      setGrupo(null)
                    }}
                    className="mt-3 min-h-11 text-base font-semibold underline underline-offset-4"
                  >
                    Quitar filtros
                  </button>
                )}
              </div>
            ) : (
              <ul aria-label="Ejercicios del catálogo" className="border-t border-linea md:grid md:grid-cols-2 md:gap-x-8 lg:gap-x-10">
                {ejercicios.map((e) => (
                  <li key={e.id} className="border-b border-linea">
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
      className={`min-h-11 shrink-0 rounded-full border-[1.5px] px-4 font-semibold whitespace-nowrap ${
        activo ? 'border-verde bg-verde text-negro' : 'border-borde-control bg-blanco text-negro hover:bg-hueso'
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
      <p className="mt-0.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{NOMBRE_GRUPO[e.grupoMuscular]}</span>
        {!e.activo && (
          <span className="rounded-full border border-borde-control px-2.5 py-0.5 text-xs font-semibold text-grafito">
            Desactivado
          </span>
        )}
      </p>
      {e.descripcion && <p className="mt-1 text-sm text-grafito">{e.descripcion}</p>}
    </div>
  )

  if (!editable) return <div className="py-4">{contenido}</div>
  return (
    <Link
      to={`/ejercicios/${e.id}/editar`}
      className="-mx-2 flex items-center gap-3 px-2 py-4 hover:bg-hueso"
      aria-label={`Editar ${e.nombre}`}
    >
      {contenido}
      <IconoFlecha className="shrink-0" />
    </Link>
  )
}
