import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PERMISOS, permisosDe, type Permiso } from '@gymtrack/shared';
import { Rol, type Usuario } from '../generated/prisma/client';
import { UsuarioActual } from './usuario-actual.decorator';

/** Respuesta de GET /api/auth/yo. */
export class PerfilSesion {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'daniela.perez@unal.edu.co' })
  correo!: string;

  @ApiProperty({ example: 'Daniela' })
  nombres!: string;

  @ApiProperty({ example: 'Pérez Gómez' })
  apellidos!: string;

  @ApiProperty({ enum: Rol, enumName: 'Rol', example: 'INSTRUCTOR' })
  rol!: Usuario['rol'];

  @ApiProperty({
    enum: PERMISOS,
    enumName: 'Permiso',
    isArray: true,
    example: ['GESTIONAR_CUPOS_GIMNASIO', 'GESTIONAR_CANCHA'],
    description:
      'Lo que el usuario puede gestionar según su rol (PERMISOS_POR_ROL, DT-16). Vacío para un deportista. La web lo usa para mostrar el panel del personal.',
  })
  permisos!: Permiso[];
}

@ApiTags('Autenticación')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('yo')
  @ApiOperation({
    summary: 'Perfil del usuario con sesión iniciada',
    description:
      'Valida el token de Supabase Auth y devuelve el perfil, el rol guardado en GymTrack y los permisos de ese rol.',
  })
  @ApiOkResponse({ description: 'Perfil del usuario.', type: PerfilSesion })
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
      permisos: [...permisosDe(usuario.rol)],
    };
  }
}
