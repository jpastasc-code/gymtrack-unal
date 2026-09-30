import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function ProgresoPage() {
  return (
    <Pantalla titulo="Progreso" volverA="/">
      <EnConstruccion
        historia="GYMM-31, GYMM-34 y GYMM-35"
        descripcion="Mira cómo evolucionan tus cargas por ejercicio y tus medidas corporales."
      />
    </Pantalla>
  )
}
