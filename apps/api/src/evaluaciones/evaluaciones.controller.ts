import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { BuscarDeportistasDto, CrearEvaluacionDto } from './evaluaciones.dto';
import {
  EvaluacionesService,
  type DeportistaResumen,
  type EvaluacionVista,
} from './evaluaciones.service';

const idDeportista = new ParseUUIDPipe({
  exceptionFactory: () =>
    new NotFoundException('Ese deportista no existe o no está activo.'),
});

/** Evaluaciones físicas que registran los instructores (GYMM-13). */
@ApiTags('Evaluaciones')
@ApiBearerAuth()
@Roles('INSTRUCTOR', 'ADMIN')
@ApiForbiddenResponse({ description: 'Solo instructores y administradores.' })
@Controller('deportistas')
export class EvaluacionesController {
  constructor(private readonly evaluaciones: EvaluacionesService) {}

  @Get()
  @ApiOperation({
    summary: 'Buscar deportistas para evaluar',
    description:
      'Por nombre, apellido, documento o correo. Máximo 20 resultados.',
  })
  @ApiOkResponse({ description: 'Deportistas activos que coinciden.' })
  buscar(@Query() filtro: BuscarDeportistasDto): Promise<DeportistaResumen[]> {
    return this.evaluaciones.buscarDeportistas(filtro.q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Datos básicos de un deportista' })
  @ApiNotFoundResponse({ description: 'No existe o no está activo.' })
  deportista(
    @Param('id', idDeportista) id: string,
  ): Promise<DeportistaResumen> {
    return this.evaluaciones.deportista(id);
  }

  @Get(':id/evaluaciones')
  @ApiOperation({
    summary: 'Historial de evaluaciones, de la más reciente a la más antigua',
  })
  historial(@Param('id', idDeportista) id: string): Promise<EvaluacionVista[]> {
    return this.evaluaciones.historial(id);
  }

  @Post(':id/evaluaciones')
  @ApiOperation({
    summary: 'Registrar una evaluación física',
    description:
      'Crea una evaluación nueva con su fecha; las anteriores no se modifican. Valida rangos razonables de cada medida.',
  })
  @ApiCreatedResponse({ description: 'Evaluación registrada.' })
  @ApiBadRequestResponse({
    description:
      'Algún valor está fuera de rango; `errores` indica cuál (p. ej. `medidas.2.valor`).',
  })
  registrar(
    @Param('id', idDeportista) id: string,
    @Body() dto: CrearEvaluacionDto,
    @UsuarioActual() instructor: Usuario,
  ): Promise<EvaluacionVista> {
    return this.evaluaciones.registrar(id, instructor.id, dto);
  }
}
