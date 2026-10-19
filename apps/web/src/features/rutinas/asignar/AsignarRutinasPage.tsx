import { Pantalla } from '../../../components/Pantalla'
import { BuscadorDeportistas } from '../../evaluacion/BuscadorDeportistas'

/** Paso 1 de GYMM-21: el instructor busca al deportista al que le va a asignar una rutina. */
export function AsignarRutinasPage() {
  return (
    <Pantalla titulo="Rutinas" volverA="/" estrecha>
      <p className="mb-4 text-grafito">Busca al deportista para ver su rutina o asignarle una nueva.</p>
      <BuscadorDeportistas enlace={(d) => `/rutinas/${d.id}`} />
    </Pantalla>
  )
}
