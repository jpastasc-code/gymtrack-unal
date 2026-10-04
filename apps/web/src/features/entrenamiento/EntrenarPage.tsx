import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function EntrenarPage() {
  return (
    <Pantalla titulo="Entrenar" estrecha>
      <EnConstruccion
        historia="GYMM-26"
        descripcion="Registra cada serie con un toque: la carga y las repeticiones de tu última sesión aparecen ya llenas."
      />
    </Pantalla>
  )
}
