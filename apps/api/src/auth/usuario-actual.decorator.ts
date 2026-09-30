import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Usuario } from '../generated/prisma/client';
import type { RequestConUsuario } from './auth.guard';

/** Inyecta el perfil del usuario autenticado (lo carga el AuthGuard). */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): Usuario | undefined =>
    contexto.switchToHttp().getRequest<RequestConUsuario>().usuario,
);
