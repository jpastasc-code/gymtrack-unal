import { useState } from 'react'
import { Link } from 'react-router'
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
    <Pantalla titulo="Evaluaciones" volverA="/">
      <p className="mb-4 text-gris">Busca al deportista para ver sus evaluaciones o registrar una nueva.</p>
      <label htmlFor="buscar-deportista" className="sr-only">
        Buscar deportista
      </label>
      <input
        id="buscar-deportista"
        type="search"
        placeholder="Nombre, documento o correo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="min-h-12 w-full rounded-xl border-2 border-borde-control bg-superficie px-4 text-lg placeholder:text-gris focus:border-campus focus:outline-3 focus:outline-offset-2 focus:outline-campus"
      />

      <div className="mt-4">
        {isPending && <p className="text-gris" role="status">Buscando deportistas…</p>}
        {isError && (
          <p role="alert" className="rounded-2xl bg-superficie p-5 font-medium text-alerta">
            {error.message}
          </p>
        )}
        {deportistas?.length === 0 && (
          <p className="rounded-2xl border-2 border-dashed border-linea bg-superficie p-5 text-lg">
            {q.trim() ? 'Ningún deportista coincide con la búsqueda.' : 'Aún no hay deportistas registrados.'}
          </p>
        )}
        {deportistas && deportistas.length > 0 && (
          <ul aria-label="Deportistas" className="divide-y divide-linea overflow-hidden rounded-2xl bg-superficie">
            {deportistas.map((d) => (
              <li key={d.id}>
                <Link to={`/evaluaciones/${d.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-campus-claro">
                  <span className="flex-1">
                    <span className="block text-lg font-semibold">
                      {d.nombres} {d.apellidos}
                    </span>
                    <span className="block text-sm text-gris">
                      Documento {d.documento}
                    </span>
                  </span>
                  <IconoFlecha className="shrink-0 text-campus" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Pantalla>
  )
}
