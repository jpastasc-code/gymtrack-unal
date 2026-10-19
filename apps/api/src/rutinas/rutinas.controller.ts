import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/auth.decorators';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import { CrearRutinaDto } from './rutinas.dto';
import { RutinasService, type RutinaVista } from './rutinas.service';

const idDeportista = new ParseUUIDPipe({
  exceptionFactory: () =>
    new NotFoundException('Ese deportista no existe o no está activo.'),
});

/** Rutinas que arman los instructores y ven los deportistas en su celular (GYMM-21). */
@ApiTags('Rutinas')
@ApiBearerAuth()
@Controller()
export class RutinasController {
  constructor(private readonly rutinas: RutinasService) {}

  @Get('rutinas/mia')
  @ApiOperation({ summary: 'Mi rutina vigente, organizada por días' })
  @ApiOkResponse({ description: 'La rutina vigente del usuario.' })
  @ApiNotFoundResponse({ description: 'Aún no tiene una rutina asignada.' })
  mia(@UsuarioActual() usuario: Usuario): Promise<RutinaVista> {
    return this.rutinas.vigente(usuario.id);
  }

  @Get('deportistas/:id/rutinas')
  @Roles('INSTRUCTOR', 'ADMIN')
  @ApiOperation({
    summary: 'Rutinas de un deportista (instructores)',
    description: 'Primero la vigente y luego las anteriores.',
  })
  @ApiForbiddenResponse({ description: 'Solo instructores y administradores.' })
  @ApiNotFoundResponse({
    description: 'El deportista no existe o no está activo.',
  })
  historial(@Param('id', idDeportista) id: string): Promise<RutinaVista[]> {
    return this.rutinas.historial(id);
  }

  @Post('deportistas/:id/rutinas')
  @Roles('INSTRUCTOR', 'ADMIN')
  @ApiOperation({
    summary: 'Armar y asignar una rutina (instructores)',
    description:
      'Los ejercicios van en el orden en que se hacen y `dia` los reparte en días seguidos desde el 1. La rutina que el deportista tenía deja de estar vigente.',
  })
  @ApiCreatedResponse({ description: 'Rutina asignada; queda vigente.' })
  @ApiBadRequestResponse({
    description:
      'Datos no válidos; `errores` indica cuál (p. ej. `ejercicios.2.series`).',
  })
  @ApiConflictResponse({
    description: 'Otra persona asignó una rutina al mismo deportista a la vez.',
  })
  @ApiForbiddenResponse({ description: 'Solo instructores y administradores.' })
  asignar(
    @Param('id', idDeportista) id: string,
    @Body() dto: CrearRutinaDto,
    @UsuarioActual() instructor: Usuario,
  ): Promise<RutinaVista> {
    return this.rutinas.asignar(id, instructor.id, dto);
  }
}
