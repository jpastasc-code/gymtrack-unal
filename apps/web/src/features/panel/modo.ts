import type { PerfilSesion } from '../auth/tipos'

/**
 * Modo de la app (GYMM-47): el del deportista (Inicio, Rutina, Entrenar…) o el panel del personal.
 * Cambiar de modo no cambia permisos: solo qué se muestra. El último modo elegido se recuerda en
 * este navegador para abrir ahí al iniciar sesión.
 */
export type Modo = 'deportista' | 'panel'

const CLAVE_MODO = 'gymtrack:modo'

export function leerModo(): Modo | null {
  try {
    const valor = localStorage.getItem(CLAVE_MODO)
    return valor === 'deportista' || valor === 'panel' ? valor : null
  } catch {
    return null
  }
}

export function guardarModo(modo: Modo): void {
  try {
    localStorage.setItem(CLAVE_MODO, modo)
  } catch {
    // Sin almacenamiento (modo privado): el modo vale mientras la app esté abierta.
  }
}

/**
 * A dónde ir al iniciar sesión cuando no se pidió una pantalla concreta: al último modo guardado
 * y, si no hay ninguno, al panel para el personal. Sin perfil (sin conexión) se abre el modo
 * deportista, para que el instructor pueda entrenar (DT-14).
 */
export function destinoInicial(perfil: PerfilSesion | null, modo: Modo | null = leerModo()): string {
  const esPersonal = (perfil?.permisos.length ?? 0) > 0
  if (!esPersonal || modo === 'deportista') return '/'
  return '/panel'
}
