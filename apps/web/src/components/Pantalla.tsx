import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { IconoAtras } from './iconos'

interface Props {
  titulo: string
  /** Ruta a la que vuelve el botón de atrás (pantallas secundarias). */
  volverA?: string
  /** Formularios y fichas: desde la tableta el contenido no pasa de una columna cómoda de leer. */
  estrecha?: boolean
  children: ReactNode
}

/** Estructura común de una pantalla: titular grande y contenido. */
export function Pantalla({ titulo, volverA, estrecha, children }: Props) {
  return (
    <div
      className={`mx-auto w-full max-w-lg px-5 pt-6 pb-8 md:px-8 md:pt-8 lg:px-10 lg:pt-10 ${estrecha ? 'md:max-w-2xl' : 'md:max-w-3xl lg:max-w-6xl'}`}
    >
      <header className="mb-6 flex items-center gap-1 md:mb-8">
        {volverA && (
          <Link
            to={volverA}
            className="-ml-3 grid size-11 shrink-0 place-items-center rounded-full text-negro hover:bg-hueso"
            aria-label="Volver"
          >
            <IconoAtras />
          </Link>
        )}
        <h1 className="titular text-5xl md:text-6xl lg:text-7xl">{titulo}</h1>
      </header>
      {children}
    </div>
  )
}
