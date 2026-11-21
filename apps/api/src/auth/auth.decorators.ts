import { SetMetadata } from '@nestjs/common';
import type { Permiso } from '@gymtrack/shared';

export const CLAVE_PUBLICO = 'gymtrack:publico';
export const CLAVE_PERMISOS = 'gymtrack:permisos';

/** Marca una ruta (o un controlador entero) como accesible sin sesión. */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/**
 * Restringe una ruta a quien tenga al menos uno de estos permisos (DT-16). Los permisos de
 * cada rol están en PERMISOS_POR_ROL (`@gymtrack/shared`). Sin este decorador, cualquier
 * usuario con sesión y perfil activo puede entrar.
 */
export const Permisos = (...permisos: Permiso[]) =>
  SetMetadata(CLAVE_PERMISOS, permisos);
