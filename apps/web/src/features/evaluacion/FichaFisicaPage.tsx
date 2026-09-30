import { EnConstruccion } from '../../components/EnConstruccion'
import { Pantalla } from '../../components/Pantalla'

export function FichaFisicaPage() {
  return (
    <Pantalla titulo="Ficha física" volverA="/">
      <EnConstruccion
        historia="GYMM-23"
        descripcion="Consulta tus evaluaciones: peso, talla, porcentaje de grasa, perímetros y resultados de los tests."
      />
    </Pantalla>
  )
}
