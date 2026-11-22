import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { tienePermiso, type Permiso } from '@gymtrack/shared';
import type { Usuario } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CLAVE_PERMISOS, CLAVE_PUBLICO } from './auth.decorators';
import {
  TokenInvalidoError,
  VerificadorToken,
} from './verificador-token.service';

export interface RequestConUsuario extends Request {
  usuario?: Usuario;
}

/**
 * Guard global: toda ruta exige un token válido de Supabase Auth, salvo las marcadas
 * con @Publico(). El rol se lee de la tabla `usuario` (fuente de verdad, DT-05) y, si la
 * ruta declara @Permisos(...), debe tener al menos uno de ellos (DT-16).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verificador: VerificadorToken,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const objetivos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, objetivos)) {
      return true;
    }

    const request = contexto.switchToHttp().getRequest<RequestConUsuario>();
    const token = extraerToken(request);
    if (!token) {
      throw new UnauthorizedException('Inicia sesión para continuar.');
    }

    let sub: string;
    try {
      sub = (await this.verificador.verificar(token)).sub;
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof TokenInvalidoError
          ? error.message
          : 'La sesión no es válida.',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: sub },
    });
    if (!usuario || !usuario.activo) {
      throw new ForbiddenException(
        'Tu cuenta no tiene un perfil activo en GymTrack. Habla con el personal del gimnasio.',
      );
    }
    request.usuario = usuario;

    const permisos = this.reflector.getAllAndOverride<Permiso[] | undefined>(
      CLAVE_PERMISOS,
      objetivos,
    );
    if (
      permisos?.length &&
      !permisos.some((permiso) => tienePermiso(usuario.rol, permiso))
    ) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return true;
  }
}

function extraerToken(request: Request): string | undefined {
  const [tipo, token] = (request.headers.authorization ?? '').split(' ');
  return tipo?.toLowerCase() === 'bearer' && token ? token : undefined;
}
