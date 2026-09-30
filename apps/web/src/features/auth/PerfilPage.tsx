import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function PerfilPage() {
  return (
    <Pantalla titulo="Perfil">
      <EnConstruccion
        historia="GYMM-11 y GYMM-24"
        descripcion="Actualiza tus datos personales y tu objetivo de entrenamiento."
      />
    </Pantalla>
  )
}
