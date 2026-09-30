import { SetMetadata } from '@nestjs/common';
import type { Rol } from '../generated/prisma/enums';

export const CLAVE_PUBLICO = 'gymtrack:publico';
export const CLAVE_ROLES = 'gymtrack:roles';

/** Marca una ruta (o un controlador entero) como accesible sin sesión. */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);

/**
 * Restringe una ruta a ciertos roles. Sin este decorador, cualquier usuario con
 * sesión y perfil activo puede entrar.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(CLAVE_ROLES, roles);
