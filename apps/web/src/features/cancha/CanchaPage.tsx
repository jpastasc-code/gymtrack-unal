import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function CanchaPage() {
  return (
    <Pantalla titulo="Cancha sintética" volverA="/reservas">
      <EnConstruccion
        historia="GYMM-20 y GYMM-28"
        descripcion="Consulta las franjas libres de la semana y reserva la cancha sin ir al área de deportes."
      />
    </Pantalla>
  )
}
