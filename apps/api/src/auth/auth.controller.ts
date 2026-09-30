import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Usuario } from '../generated/prisma/client';
import { UsuarioActual } from './usuario-actual.decorator';

export interface PerfilSesion {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  rol: Usuario['rol'];
}

@ApiTags('Autenticación')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('yo')
  @ApiOperation({
    summary: 'Perfil del usuario con sesión iniciada',
    description:
      'Valida el token de Supabase Auth y devuelve el perfil y el rol guardados en GymTrack.',
  })
  @ApiOkResponse({ description: 'Perfil del usuario.' })
  @ApiUnauthorizedResponse({
    description: 'Sin token o token inválido/expirado.',
  })
  @ApiForbiddenResponse({
    description: 'El usuario no tiene un perfil activo.',
  })
  yo(@UsuarioActual() usuario: Usuario): PerfilSesion {
    return {
      id: usuario.id,
      correo: usuario.correo,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
    };
  }
}
