import { Link } from 'react-router'
import { IconoFlecha } from '../../components/iconos'
import { Pantalla } from '../../components/Pantalla'
import { usePermisos } from '../auth/permisos'
import { EnlaceModoDeportista } from './CambioModo'
import { seccionesPara } from './secciones'

/**
 * Inicio del panel del personal (GYMM-47): una fila por cada sección que permiten sus permisos,
 * con el mismo patrón que las filas de Inicio. RutaProtegida ya garantiza que haya al menos una.
 */
export function PanelInicioPage() {
  const { permisos } = usePermisos()
  const secciones = seccionesPara(permisos)

  return (
    <Pantalla titulo="Panel">
      <p className="-mt-3 mb-6 text-lg text-grafito md:-mt-5">Lo que gestionas en el gimnasio.</p>

      <nav aria-label="Secciones del panel">
        <ul className="border-t border-linea md:grid md:grid-cols-2 md:gap-x-8 lg:gap-x-10">
          {secciones.map((s) => (
            <li key={s.a} className="border-b border-linea">
              <Link to={s.a} className="-mx-2 flex min-h-16 items-center gap-3 px-2 py-4 hover:bg-hueso">
                <div className="flex-1">
                  <p className="text-lg font-semibold">{s.titulo}</p>
                  <p className="text-sm text-grafito">{s.detalle}</p>
                </div>
                <IconoFlecha className="shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* En el computador el botón ya está en la barra superior. */}
      <EnlaceModoDeportista className="mt-8 md:w-fit lg:hidden" />
    </Pantalla>
  )
}
