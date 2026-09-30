import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import { ActualizarPerfilDto } from './actualizar-perfil.dto';
import { aPerfil, PerfilService, type Perfil } from './perfil.service';

@ApiTags('Perfil')
@ApiBearerAuth()
@Controller('perfil')
export class PerfilController {
  constructor(private readonly perfiles: PerfilService) {}

  @Get()
  @ApiOperation({ summary: 'Mi perfil completo' })
  @ApiOkResponse({
    description: 'Datos personales, institucionales y de entrenamiento.',
  })
  obtener(@UsuarioActual() usuario: Usuario): Perfil {
    return aPerfil(usuario);
  }

  @Patch()
  @ApiOperation({
    summary: 'Actualizar mis datos personales y de entrenamiento',
    description:
      'Solo cambia los campos enviados. Documento, correo y rol no se pueden editar.',
  })
  @ApiOkResponse({ description: 'Perfil actualizado.' })
  @ApiBadRequestResponse({
    description: 'Algún dato no es válido; `errores` indica cuál y por qué.',
  })
  actualizar(
    @UsuarioActual() usuario: Usuario,
    @Body() dto: ActualizarPerfilDto,
  ): Promise<Perfil> {
    return this.perfiles.actualizar(usuario.id, dto);
  }
}
