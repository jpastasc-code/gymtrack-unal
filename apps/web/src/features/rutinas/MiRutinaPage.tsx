import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function MiRutinaPage() {
  return (
    <Pantalla titulo="Mi rutina">
      <EnConstruccion
        historia="GYMM-22"
        descripcion="Aquí verás la rutina que te asignó tu instructor, con cada ejercicio, series y repeticiones."
      />
    </Pantalla>
  )
}
