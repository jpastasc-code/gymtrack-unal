import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function NutricionPage() {
  return (
    <Pantalla titulo="Nutrición" volverA="/" estrecha>
      <EnConstruccion
        historia="GYMM-25 y GYMM-30"
        descripcion="Calcula tu requerimiento calórico diario y la distribución de proteínas, carbohidratos y grasas según tu objetivo."
      />
    </Pantalla>
  )
}
