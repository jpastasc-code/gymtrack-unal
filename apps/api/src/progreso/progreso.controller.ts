import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsuarioActual } from '../auth/usuario-actual.decorator';
import type { Usuario } from '../generated/prisma/client';
import {
  ProgresoService,
  type EjercicioConHistorico,
  type HistoricoEjercicio,
} from './progreso.service';

const idEjercicio = new ParseUUIDPipe({
  exceptionFactory: () => new NotFoundException('Ese ejercicio no existe.'),
});

/** Histórico por ejercicio (GYMM-31). Siempre del usuario del token: no recibe su id. */
@ApiTags('Progreso')
@ApiBearerAuth()
@Controller('progreso')
export class ProgresoController {
  constructor(private readonly progreso: ProgresoService) {}

  @Get('ejercicios')
  @ApiOperation({
    summary: 'Los ejercicios que he registrado',
    description:
      'Cada ejercicio con el número de sesiones, la fecha de la última y la mejor marca (la serie con más carga), del último que hice al primero.',
  })
  @ApiOkResponse({ description: 'Lista vacía si aún no ha registrado series.' })
  ejercicios(
    @UsuarioActual() usuario: Usuario,
  ): Promise<EjercicioConHistorico[]> {
    return this.progreso.ejercicios(usuario.id);
  }

  @Get('ejercicios/:id')
  @ApiOperation({
    summary: 'Mi histórico en un ejercicio',
    description:
      'Las series que he registrado en el ejercicio, agrupadas por sesión de la más reciente a la más antigua, y la mejor marca: más carga; si empata, más repeticiones; si también, la primera vez.',
  })
  @ApiOkResponse({
    description: '`sesiones` vacío y `mejorMarca` null si aún no lo ha hecho.',
  })
  @ApiNotFoundResponse({ description: 'El ejercicio no existe.' })
  historico(
    @Param('id', idEjercicio) id: string,
    @UsuarioActual() usuario: Usuario,
  ): Promise<HistoricoEjercicio> {
    return this.progreso.historico(usuario.id, id);
  }
}
