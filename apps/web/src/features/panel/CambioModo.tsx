import { Link } from 'react-router'
import { ENLACE_SECUNDARIO } from '../../components/estilos'
import { IconoFlecha } from '../../components/iconos'
import { usePermisos } from '../auth/permisos'
import { guardarModo } from './modo'
import { seccionesPara } from './secciones'

/** En el panel: vuelve al modo deportista (Inicio, Rutina, Entrenar…) y lo recuerda. */
export function EnlaceModoDeportista({ className = '' }: { className?: string }) {
  return (
    <Link to="/" onClick={() => guardarModo('deportista')} className={`${ENLACE_SECUNDARIO} ${className}`}>
      Entrenar como deportista
    </Link>
  )
}

/**
 * En el modo deportista: fila "Ir a mi panel", solo para quien tiene algún permiso.
 * Usa el mismo patrón que las filas de Inicio.
 */
export function FilaIrAlPanel() {
  const { permisos } = usePermisos()
  const secciones = seccionesPara(permisos)
  if (secciones.length === 0) return null

  const nombres = secciones.map((s, i) => (i === 0 ? s.titulo : s.titulo.toLowerCase()))
  const detalle = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`

  return (
    <Link
      to="/panel"
      onClick={() => guardarModo('panel')}
      className="flex min-h-16 items-center gap-3 px-5 py-4 hover:bg-hueso md:px-1"
    >
      <div className="flex-1">
        <p className="text-lg font-semibold">Ir a mi panel</p>
        <p className="text-sm text-grafito">{detalle}</p>
      </div>
      <IconoFlecha className="shrink-0" />
    </Link>
  )
}
