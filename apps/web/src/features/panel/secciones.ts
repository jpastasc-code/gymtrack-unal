import type { ComponentType, SVGProps } from 'react'
import { IconoCalendario, IconoCancha, IconoEvaluacion, IconoPesa, IconoRutina } from '../../components/iconos'
import type { Permiso } from '../auth/tipos'

export interface SeccionPanel {
  a: string
  /** Nombre corto: pestaña de la barra y titular de la fila. */
  titulo: string
  detalle: string
  permiso: Permiso
  Icono: ComponentType<SVGProps<SVGSVGElement>>
}

/**
 * Secciones del panel del personal (GYMM-47), en el orden en que aparecen. Cada una se muestra
 * solo a quien tiene su permiso: la navegación sale de aquí y de los permisos, nunca del rol.
 */
export const SECCIONES_PANEL: readonly SeccionPanel[] = [
  {
    a: '/panel/rutinas',
    titulo: 'Rutinas',
    detalle: 'Arma la rutina de un deportista y asígnasela',
    permiso: 'GESTIONAR_RUTINAS',
    Icono: IconoRutina,
  },
  {
    a: '/panel/evaluaciones',
    titulo: 'Evaluaciones',
    detalle: 'Registra las medidas y los tests de un deportista',
    permiso: 'REGISTRAR_EVALUACIONES',
    Icono: IconoEvaluacion,
  },
  {
    a: '/panel/ejercicios',
    titulo: 'Ejercicios',
    detalle: 'Agrega, edita o desactiva ejercicios del catálogo',
    permiso: 'GESTIONAR_EJERCICIOS',
    Icono: IconoPesa,
  },
  {
    a: '/panel/gimnasio',
    titulo: 'Cupos',
    detalle: 'Cuántas personas caben en cada franja del gimnasio',
    permiso: 'GESTIONAR_CUPOS_GIMNASIO',
    Icono: IconoCalendario,
  },
  {
    a: '/panel/cancha',
    titulo: 'Cancha',
    detalle: 'En qué horarios se puede reservar la cancha sintética',
    permiso: 'GESTIONAR_CANCHA',
    Icono: IconoCancha,
  },
]

/** Las secciones que puede ver quien tiene estos permisos. */
export function seccionesPara(permisos: readonly Permiso[]): SeccionPanel[] {
  return SECCIONES_PANEL.filter((s) => permisos.includes(s.permiso))
}
