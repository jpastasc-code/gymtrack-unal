import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import { RegistrarSerieDto } from './sesiones.dto';
import {
  SesionesService,
  type SerieVista,
  type SesionVista,
} from './sesiones.service';

const idSesion = new ParseUUIDPipe({
  exceptionFactory: () =>
    new NotFoundException('Esa sesión de entrenamiento no existe.'),
});

/** Registro rápido de series mientras se entrena (GYMM-26). */
@ApiTags('Sesiones de entrenamiento')
@ApiBearerAuth()
@Controller('sesiones')
export class SesionesController {
  constructor(private readonly sesiones: SesionesService) {}

  @Get('actual')
  @ApiOperation({ summary: 'Mi sesión de entrenamiento abierta' })
  @ApiOkResponse({ description: 'La sesión abierta con sus series.' })
  @ApiNotFoundResponse({ description: 'No hay una sesión abierta.' })
  actual(@UsuarioActual() usuario: Usuario): Promise<SesionVista> {
    return this.sesiones.actual(usuario.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Empezar a entrenar',
    description:
      'Abre una sesión con la rutina vigente. Si ya hay una abierta, la devuelve en lugar de abrir otra.',
  })
  @ApiCreatedResponse({ description: 'La sesión abierta.' })
  @ApiNotFoundResponse({ description: 'Aún no tiene una rutina asignada.' })
  iniciar(@UsuarioActual() usuario: Usuario): Promise<SesionVista> {
    return this.sesiones.iniciar(usuario.id);
  }

  @Put(':id/series')
  @ApiOperation({
    summary: 'Registrar una serie',
    description:
      'Guarda la carga y las repeticiones reales. Si la serie ya estaba registrada, la corrige, así que reenviarla no la duplica.',
  })
  @ApiOkResponse({ description: 'La serie registrada.' })
  @ApiBadRequestResponse({
    description:
      'Datos no válidos o el ejercicio no está en la rutina; `errores` indica cuál.',
  })
  @ApiNotFoundResponse({
    description: 'La sesión no existe o es de otra persona.',
  })
  @ApiConflictResponse({ description: 'La sesión ya terminó.' })
  registrarSerie(
    @Param('id', idSesion) id: string,
    @Body() dto: RegistrarSerieDto,
    @UsuarioActual() usuario: Usuario,
  ): Promise<SerieVista> {
    return this.sesiones.registrarSerie(usuario.id, id, dto);
  }

  @Post(':id/cerrar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Terminar la sesión' })
  @ApiOkResponse({ description: 'La sesión terminada.' })
  @ApiNotFoundResponse({
    description: 'La sesión no existe o es de otra persona.',
  })
  cerrar(
    @Param('id', idSesion) id: string,
    @UsuarioActual() usuario: Usuario,
  ): Promise<SesionVista> {
    return this.sesiones.cerrar(usuario.id, id);
  }
}
