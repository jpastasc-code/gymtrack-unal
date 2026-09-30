import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconoAtras } from './iconos'

interface Props {
  titulo: string
  /** Ruta a la que vuelve el botón de atrás (pantallas secundarias). */
  volverA?: string
  children: ReactNode
}

/** Estructura común de una pantalla: título grande y contenido. */
export function Pantalla({ titulo, volverA, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pt-4 pb-6">
      <header className="mb-5 flex items-center gap-2">
        {volverA && (
          <Link
            to={volverA}
            className="-ml-2 grid size-11 place-items-center rounded-full text-campus-oscuro hover:bg-campus-claro"
            aria-label="Volver"
          >
            <IconoAtras />
          </Link>
        )}
        <h1 className="font-display text-4xl leading-none font-bold tracking-tight">{titulo}</h1>
      </header>
      {children}
    </div>
  )
}
