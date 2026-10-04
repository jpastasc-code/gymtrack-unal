import { useState } from 'react'
import { Link } from 'react-router'
import { BUSCADOR } from '../../components/estilos'
import { IconoFlecha } from '../../components/iconos'
import { Pantalla } from '../../components/Pantalla'
import { useRetardado } from '../../lib/useRetardado'
import { useDeportistas } from './api'

/** Paso 1 de GYMM-13: el instructor busca al deportista que va a evaluar. */
export function EvaluarPage() {
  const [texto, setTexto] = useState('')
  const q = useRetardado(texto)
  const { data: deportistas, isPending, isError, error } = useDeportistas(q)

  return (
    <Pantalla titulo="Evaluaciones" volverA="/" estrecha>
      <p className="mb-4 text-grafito">Busca al deportista para ver sus evaluaciones o registrar una nueva.</p>
      <label htmlFor="buscar-deportista" className="sr-only">
        Buscar deportista
      </label>
      <input
        id="buscar-deportista"
        type="search"
        placeholder="Nombre, documento o correo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={`${BUSCADOR} lg:max-w-xl`}
      />

      <div className="mt-4">
        {isPending && <p className="text-grafito" role="status">Buscando deportistas…</p>}
        {isError && (
          <p role="alert" className="rounded-xl bg-hueso p-5 font-medium text-alerta">
            {error.message}
          </p>
        )}
        {deportistas?.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-linea p-5 text-lg">
            {q.trim() ? 'Ningún deportista coincide con la búsqueda.' : 'Aún no hay deportistas registrados.'}
          </p>
        )}
        {deportistas && deportistas.length > 0 && (
          <ul aria-label="Deportistas" className="divide-y divide-linea border-y border-linea">
            {deportistas.map((d) => (
              <li key={d.id}>
                <Link to={`/evaluaciones/${d.id}`} className="-mx-2 flex items-center gap-3 px-2 py-4 hover:bg-hueso">
                  <span className="flex-1">
                    <span className="block text-lg font-semibold">
                      {d.nombres} {d.apellidos}
                    </span>
                    <span className="block text-sm text-grafito">
                      Documento {d.documento}
                    </span>
                  </span>
                  <IconoFlecha className="shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Pantalla>
  )
}
