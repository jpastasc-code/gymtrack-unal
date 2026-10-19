import { Pantalla } from '../../components/Pantalla'
import { BuscadorDeportistas } from './BuscadorDeportistas'

/** Paso 1 de GYMM-13: el instructor busca al deportista que va a evaluar. */
export function EvaluarPage() {
  return (
    <Pantalla titulo="Evaluaciones" volverA="/" estrecha>
      <p className="mb-4 text-grafito">Busca al deportista para ver sus evaluaciones o registrar una nueva.</p>
      <BuscadorDeportistas enlace={(d) => `/evaluaciones/${d.id}`} />
    </Pantalla>
  )
}
